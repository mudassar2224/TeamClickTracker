/**
 * TEST SUITE 3: AUTOMATED JOBS SCHEDULER
 * Tests that daily jobs are scheduled correctly
 */

import cron from 'node-cron';
import { db } from './backend/config/firebase-admin.js';

async function testScheduledJobs() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST SUITE 3: AUTOMATED JOBS SCHEDULER');
  console.log('='.repeat(60));

  try {
    // TEST 1: Verify Cron syntax
    console.log('\n📝 TEST 1: Verify Cron Job Scheduling');
    console.log('-'.repeat(60));
    
    const jobs = [
      { time: '0 2 * * *', name: 'Web Scraper (2:00 AM)', description: 'Fetch articles' },
      { time: '15 2 * * *', name: 'Category Counter (2:15 AM)', description: 'Count articles' },
      { time: '0 3 * * *', name: 'GA Data Fetcher (3:00 AM)', description: 'Fetch GA data' }
    ];

    jobs.forEach((job, idx) => {
      try {
        const isValid = cron.validate(job.time);
        if (isValid) {
          console.log(`✅ ${job.name}`);
          console.log(`   Cron: ${job.time}`);
          console.log(`   Task: ${job.description}`);
        } else {
          console.log(`❌ ${job.name} - Invalid cron syntax`);
        }
      } catch (e) {
        console.log(`❌ ${job.name} - Error: ${e.message}`);
      }
    });

    // TEST 2: Check job logs
    console.log('\n📝 TEST 2: Check Job Execution Logs');
    console.log('-'.repeat(60));
    const jobLogsSnapshot = await db.collection('job_logs').orderBy('timestamp', 'desc').limit(20).get();
    
    console.log(`✅ Total job logs found: ${jobLogsSnapshot.size}`);
    
    if (jobLogsSnapshot.size > 0) {
      console.log('\n  Recent job executions:');
      
      const jobsByName = {};
      jobLogsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!jobsByName[data.jobName]) {
          jobsByName[data.jobName] = [];
        }
        jobsByName[data.jobName].push(data);
      });

      Object.keys(jobsByName).forEach(jobName => {
        const logs = jobsByName[jobName];
        console.log(`\n  📋 ${jobName}:`);
        console.log(`     Total runs: ${logs.length}`);
        
        const successCount = logs.filter(l => l.status === 'success').length;
        const failedCount = logs.filter(l => l.status === 'failed').length;
        
        console.log(`     ✅ Successful: ${successCount}`);
        console.log(`     ❌ Failed: ${failedCount}`);
        
        // Show latest run
        const latest = logs[0];
        const timestamp = latest.timestamp?.toDate?.() || new Date(latest.timestamp);
        console.log(`     Last run: ${timestamp.toLocaleString()}`);
        console.log(`     Status: ${latest.status}`);
      });
    } else {
      console.log('⚠️ No job logs yet (jobs haven\'t run yet or timestamps differ)');
    }

    // TEST 3: Calculate next run times
    console.log('\n📝 TEST 3: Calculate Next Scheduled Run Times');
    console.log('-'.repeat(60));
    
    const now = new Date();
    console.log(`Current time: ${now.toLocaleString()}`);
    
    function getNextRun(hour, minute) {
      const next = new Date();
      next.setHours(hour, minute, 0, 0);
      
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      
      return next;
    }

    const schedules = [
      { hour: 2, minute: 0, name: 'Web Scraper' },
      { hour: 2, minute: 15, name: 'Category Counter' },
      { hour: 3, minute: 0, name: 'GA Data Fetcher' }
    ];

    schedules.forEach(schedule => {
      const nextRun = getNextRun(schedule.hour, schedule.minute);
      const hoursUntil = ((nextRun - now) / (1000 * 60 * 60)).toFixed(1);
      console.log(`📅 ${schedule.name}`);
      console.log(`   Next run: ${nextRun.toLocaleString()}`);
      console.log(`   In ${hoursUntil} hours`);
    });

    // TEST 4: Summary
    console.log('\n📝 TEST 4: System Summary');
    console.log('-'.repeat(60));
    
    const articlesCount = await db.collection('articles').count().get();
    const categoriesCount = await db.collection('categories').count().get();
    const usersCount = await db.collection('users').count().get();
    
    console.log('📊 Current Data:');
    console.log(`   Articles: ${articlesCount.data().count}`);
    console.log(`   Categories: ${categoriesCount.data().count}`);
    console.log(`   Users: ${usersCount.data().count}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ SCHEDULED JOBS TEST COMPLETE');
    console.log('='.repeat(60) + '\n');

    return true;

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
    return false;
  }
}

// Run test
testScheduledJobs().then(success => {
  process.exit(success ? 0 : 1);
});
