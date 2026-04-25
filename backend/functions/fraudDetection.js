/**
 * FRAUD_DETECTION.JS - Firebase Cloud Function
 * Detects fraudulent clicks based on patterns
 * 
 * Deploy with:
 * firebase deploy --only functions:detectFraud
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

/**
 * Fraud detection rules and thresholds
 */
const FRAUD_RULES = {
  CLICKS_PER_HOUR_PER_IP: 10,      // Max clicks per IP per hour
  CLICKS_PER_HOUR_PER_DEVICE: 5,   // Max clicks per device per hour
  CLICKS_PER_DAY_PER_IP: 50,       // Max clicks per IP per day
  CLICKS_PER_DAY_PER_DEVICE: 25,   // Max clicks per device per day
  CLICK_INTERVAL_MIN_MS: 100       // Minimum time between clicks (100ms)
};

/**
 * Cloud Function: Analyze click for fraud
 */
exports.detectFraud = functions.firestore
  .document('clicks/{clickId}')
  .onCreate(async (snap, context) => {
    const clickData = snap.data();
    const clickId = context.params.clickId;

    try {
      // Perform multiple fraud checks
      const fraudScore = await calculateFraudScore(clickData);

      // Mark as fraud if score >= 80
      const isValid = fraudScore < 80;

      await snap.ref.update({
        valid: isValid,
        fraud_score: fraudScore,
        fraud_check_timestamp: new Date(),
        fraud_reasons: await getFraudReasons(clickData, fraudScore)
      });

      if (!isValid) {
        console.log(`Fraud detected for click ${clickId}: score ${fraudScore}`);
      }

      return null;
    } catch (error) {
      console.error(`Error analyzing click ${clickId}:`, error);
      // Default to valid on error to avoid false positives
      await snap.ref.update({ valid: true });
      throw error;
    }
  });

/**
 * Calculate fraud score (0-100)
 */
async function calculateFraudScore(clickData) {
  let score = 0;

  // Check 1: Multiple clicks from same IP in short time
  const sameIpClicks = await countClicksFromIP(
    clickData.ip,
    1 // last 1 hour
  );

  if (sameIpClicks > FRAUD_RULES.CLICKS_PER_HOUR_PER_IP) {
    score += 30;
  }

  // Check 2: Multiple clicks from same device
  const sameDeviceClicks = await countClicksFromDevice(
    clickData.device_fingerprint,
    1 // last 1 hour
  );

  if (sameDeviceClicks > FRAUD_RULES.CLICKS_PER_HOUR_PER_DEVICE) {
    score += 25;
  }

  // Check 3: Daily IP limit
  const dailyIpClicks = await countClicksFromIP(
    clickData.ip,
    24 // last 24 hours
  );

  if (dailyIpClicks > FRAUD_RULES.CLICKS_PER_DAY_PER_IP) {
    score += 20;
  }

  // Check 4: Suspicious user agent (bots)
  if (isLikelyBot(clickData.user_agent)) {
    score += 20;
  }

  // Check 5: No referrer (direct traffic suspicious in some contexts)
  if (!clickData.referrer) {
    score += 5;
  }

  // Check 6: VPN/Proxy detection (simplified)
  if (await isProxyIP(clickData.ip)) {
    score += 15;
  }

  return Math.min(score, 100);
}

/**
 * Count clicks from same IP in last N hours
 */
async function countClicksFromIP(ip, hoursAgo) {
  const startTime = new Date();
  startTime.setHours(startTime.getHours() - hoursAgo);

  const snapshot = await db.collection('clicks')
    .where('ip', '==', ip)
    .where('timestamp', '>=', startTime)
    .get();

  return snapshot.docs.length;
}

/**
 * Count clicks from same device in last N hours
 */
async function countClicksFromDevice(fingerprint, hoursAgo) {
  const startTime = new Date();
  startTime.setHours(startTime.getHours() - hoursAgo);

  const snapshot = await db.collection('clicks')
    .where('device_fingerprint', '==', fingerprint)
    .where('timestamp', '>=', startTime)
    .get();

  return snapshot.docs.length;
}

/**
 * Detect bot user agents
 */
function isLikelyBot(userAgent) {
  if (!userAgent) return false;

  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java(?!script)/i,
    /automated/i
  ];

  return botPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Simplified proxy/VPN detection (check common VPN IPs)
 * In production, use a proper VPN detection API
 */
async function isProxyIP(ip) {
  // Placeholder - implement with actual VPN detection service
  // For now, return false
  return false;
}

/**
 * Get fraud reasons for documentation
 */
async function getFraudReasons(clickData, fraudScore) {
  const reasons = [];

  const sameIpClicks = await countClicksFromIP(clickData.ip, 1);
  if (sameIpClicks > FRAUD_RULES.CLICKS_PER_HOUR_PER_IP) {
    reasons.push(`Too many clicks from IP: ${sameIpClicks} in 1 hour`);
  }

  const sameDeviceClicks = await countClicksFromDevice(clickData.device_fingerprint, 1);
  if (sameDeviceClicks > FRAUD_RULES.CLICKS_PER_HOUR_PER_DEVICE) {
    reasons.push(`Too many clicks from device: ${sameDeviceClicks} in 1 hour`);
  }

  if (isLikelyBot(clickData.user_agent)) {
    reasons.push('Suspicious bot-like user agent');
  }

  if (!clickData.referrer) {
    reasons.push('No referrer detected');
  }

  return reasons;
}

/**
 * Cloud Function: Generate fraud report
 */
exports.generateFraudReport = functions.pubsub
  .schedule('every day 06:00')
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get all fraudulent clicks in last 24 hours
      const fraudSnapshot = await db.collection('clicks')
        .where('valid', '==', false)
        .where('timestamp', '>=', yesterday)
        .where('timestamp', '<', today)
        .get();

      const report = {
        date: yesterday,
        total_frauds: fraudSnapshot.docs.length,
        fraud_details: []
      };

      // Group frauds by type
      const fraudsByIP = {};
      const fraudsByDevice = {};

      fraudSnapshot.docs.forEach(doc => {
        const click = doc.data();
        
        if (!fraudsByIP[click.ip]) fraudsByIP[click.ip] = 0;
        fraudsByIP[click.ip]++;

        if (!fraudsByDevice[click.device_fingerprint]) {
          fraudsByDevice[click.device_fingerprint] = 0;
        }
        fraudsByDevice[click.device_fingerprint]++;
      });

      report.frauds_by_ip = fraudsByIP;
      report.frauds_by_device = fraudsByDevice;

      // Save report
      await db.collection('fraud_reports').add(report);

      console.log(`Generated fraud report: ${report.total_frauds} frauds detected`);
      return null;
    } catch (error) {
      console.error('Error generating fraud report:', error);
      throw error;
    }
  });
