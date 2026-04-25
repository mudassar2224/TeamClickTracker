/**
 * EARNINGS_CALCULATION.JS - Firebase Cloud Function
 * Calculates and updates earnings when a click is recorded
 * 
 * Deploy with:
 * firebase deploy --only functions:calculateEarnings
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

/**
 * Cloud Function: Calculate earnings for each valid click
 */
exports.calculateEarnings = functions.firestore
  .document('clicks/{clickId}')
  .onCreate(async (snap, context) => {
    const clickData = snap.data();
    const clickId = context.params.clickId;

    // Skip if click is marked as fraud
    if (!clickData.valid) {
      console.log(`Click ${clickId} marked as fraud, skipping earnings calculation`);
      return null;
    }

    try {
      // Get team member info
      const memberRef = db.collection('team_members').doc(clickData.team_member_id);
      const memberDoc = await memberRef.get();

      if (!memberDoc.exists) {
        console.log(`Member ${clickData.team_member_id} not found`);
        return null;
      }

      const memberData = memberDoc.data();
      const rate = memberData.rate || 0.50;

      // Calculate earning
      const earning = {
        click_id: clickId,
        team_member_id: clickData.team_member_id,
        member_name: memberData.name,
        utm_link_id: clickData.utm_link_id,
        amount: rate,
        created_at: new Date(),
        status: 'pending'
      };

      // Save earning to Firestore
      await db.collection('earnings').add(earning);

      // Update click with earning amount
      await snap.ref.update({
        earning: rate,
        earning_calculated_at: new Date()
      });

      console.log(`Earning of $${rate} recorded for click ${clickId}`);
      return null;
    } catch (error) {
      console.error(`Error calculating earnings for click ${clickId}:`, error);
      throw error;
    }
  });

/**
 * Cloud Function: Aggregate earnings summary for batch reporting
 */
exports.aggregateDailyEarnings = functions.pubsub
  .schedule('every day 23:00')
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get all earnings for today
      const earningsSnapshot = await db.collection('earnings')
        .where('created_at', '>=', today)
        .where('created_at', '<', tomorrow)
        .get();

      // Group by team member
      const earningsByMember = {};

      earningsSnapshot.docs.forEach(doc => {
        const earning = doc.data();
        const memberId = earning.team_member_id;

        if (!earningsByMember[memberId]) {
          earningsByMember[memberId] = {
            member_id: memberId,
            member_name: earning.member_name,
            total_amount: 0,
            click_count: 0,
            date: today
          };
        }

        earningsByMember[memberId].total_amount += earning.amount;
        earningsByMember[memberId].click_count++;
      });

      // Save summaries
      for (const memberId in earningsByMember) {
        await db.collection('daily_earnings_summary').add(earningsByMember[memberId]);
      }

      console.log(`Aggregated earnings for ${Object.keys(earningsByMember).length} team members`);
      return null;
    } catch (error) {
      console.error('Error aggregating daily earnings:', error);
      throw error;
    }
  });

/**
 * Cloud Function: Update member statistics
 */
exports.updateMemberStats = functions.firestore
  .document('clicks/{clickId}')
  .onCreate(async (snap, context) => {
    const clickData = snap.data();

    try {
      const memberRef = db.collection('team_members').doc(clickData.team_member_id);
      const memberDoc = await memberRef.get();

      if (!memberDoc.exists) {
        return null;
      }

      const memberStats = memberDoc.data().stats || {
        total_clicks: 0,
        valid_clicks: 0,
        invalid_clicks: 0,
        total_earnings: 0,
        last_click: null
      };

      memberStats.total_clicks++;
      if (clickData.valid) {
        memberStats.valid_clicks++;
        memberStats.total_earnings += clickData.earning || 0;
      } else {
        memberStats.invalid_clicks++;
      }
      memberStats.last_click = new Date();

      await memberRef.update({ stats: memberStats });

      return null;
    } catch (error) {
      console.error('Error updating member stats:', error);
      throw error;
    }
  });
