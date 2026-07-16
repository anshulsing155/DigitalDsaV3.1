export async function load({ url, fetch }) { // Use the provided `fetch`
    const referrer = url.searchParams.get('referrer');
    if (referrer) {
      // Use the referrer to track or log the referral action
      //console.log('Referral from user ID:', referrer);
  
      try {
        // Use `fetch` from the load function's context
        const response = await fetch('/api/referral-tracking', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ referrer }),
        });
  
        if (!response.ok) {
          console.error('Failed to track referral:', response.statusText);
          return { error: 'Failed to track referral' };
        }
  
        const data = await response.json();
        //console.log('Referral tracking response:', data);
  
        return { data }; // Return data for use in the page
      } catch (error) {
        console.error('Error tracking referral:', error);
        return { error: 'An unexpected error occurred.' };
      }
    }
  
    return {}; // Return an empty object if no referrer is present
  }
