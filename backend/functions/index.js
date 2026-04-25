/**
 * INDEX.JS - Firebase Cloud Functions Entry Point
 * Exports all cloud functions
 */

const earningsCalculation = require('./earningsCalculation');
const fraudDetection = require('./fraudDetection');

// Export all functions
module.exports = {
  calculateEarnings: earningsCalculation.calculateEarnings,
  aggregateDailyEarnings: earningsCalculation.aggregateDailyEarnings,
  updateMemberStats: earningsCalculation.updateMemberStats,
  detectFraud: fraudDetection.detectFraud,
  generateFraudReport: fraudDetection.generateFraudReport
};
