// Run this in the console on any page (including after redirect) to check PartnerStack injection status
(function() {
  const status = localStorage.getItem('ps_injection_status');
  const value = localStorage.getItem('ps_final_value');
  const submission = localStorage.getItem('ps_last_submission');
  
  console.log('=== PartnerStack Injection Report ===');
  console.log('Status:', status);
  console.log('Final Value:', value);
  if (submission) {
    try {
      const data = JSON.parse(submission);
      console.log('Submission Details:', data);
    } catch (e) {
      console.log('Submission Data:', submission);
    }
  }
  console.log('=====================================');
  
  return {
    status: status,
    value: value,
    submission: submission
  };
})();
