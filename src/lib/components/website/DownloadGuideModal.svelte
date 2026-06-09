<script lang="ts">
	interface Props {
		showModal?: any;
	}

	let {
		showModal = $bindable(false)
	}: Props = $props();


  import Modal from "./Modal.svelte";
  

  let dialog = $state<HTMLDialogElement>();
  
  let formData = $state({
    name: "",
    email: "",
    whatsappNumber: ""
  });
  
  let errors = $state({
    name: "",
    email: "",
    whatsappNumber: ""
  });
  
  let isSubmitting = $state(false);
  let submitError = $state("");
  let successMessage = $state("");
  
  function closeModal() {
    showModal = false;
    resetForm();
  }
  
  function resetForm() {
    formData = {
name: "",
email: "",
whatsappNumber: ""
    };
    errors = {
name: "",
email: "",
whatsappNumber: ""
    };
    submitError = "";
    successMessage = "";
  }
  
  function validateForm() {
    let isValid = true;
    errors = { name: "", email: "", whatsappNumber: "" };
    submitError = "";
    
    // Name validation
    if (!formData.name.trim()) {
errors.name = "Name is required";
isValid = false;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
errors.email = "Email is required";
isValid = false;
    } else if (!emailRegex.test(formData.email)) {
errors.email = "Please enter a valid email address";
isValid = false;
    }
    
    // WhatsApp number validation
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!formData.whatsappNumber.trim()) {
errors.whatsappNumber = "WhatsApp number is required";
isValid = false;
    } else if (!phoneRegex.test(formData.whatsappNumber.replace(/\D/g, ''))) {
errors.whatsappNumber = "Please enter a valid 10-digit mobile number";
isValid = false;
    }
    
    return isValid;
  }
  
  async function handleSubmit() {
    if (!validateForm()) return;
    
    isSubmitting = true;
    
    try {
// Call API to save user data
const response = await fetch('/api/download-guide', {
method: 'POST',
headers: {
'Content-Type': 'application/json',
},
body: JSON.stringify({
name: formData.name.trim(),
email: formData.email.trim(),
whatsappNumber: formData.whatsappNumber.trim()
})
});

const result = await response.json();

if (!response.ok) {
throw new Error(result.error || 'Failed to save data');
}

// Show success message if user already existed
if (result.isExistingUser) {
successMessage = `Welcome back! This is download #${result.downloadCount}`;
} else {
successMessage = "Thank you! Your information has been saved.";
}

// Trigger the download after successful API call
triggerDownload();

// Close modal after successful submission
setTimeout(() => {
closeModal();
}, 1500);

    } catch (error) {
console.error('Error submitting form:', error);
// Show error to user
submitError = (error as Error).message || 'Failed to process request. Please try again.';
    } finally {
isSubmitting = false;
    }
  }
  
  function triggerDownload() {
    // Create a temporary link to trigger download
    const link = document.createElement('a');
    link.href = '/pdfs/existing.pdf'; // Using existing PDF file
    link.download = 'Business-Loan-Guide.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  function formatPhoneNumber(value: string): string {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    // Limit to 10 digits
    return digits.slice(0, 10);
  }
  
  function handlePhoneInput(event: Event) {
    const target = event.target as HTMLInputElement;
    formData.whatsappNumber = formatPhoneNumber(target.value);
  }
</script>

<Modal bind:showModal bind:dialog closeModal={closeModal}>
  <div class="w-full max-w-md mx-auto">
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-gray-900 mb-2">Download Home Loan Guide</h2>
      <p class="text-gray-600">Please provide your details to download our comprehensive home loan guide.</p>
    </div>
    
    <!-- Success Message -->
    {#if successMessage}
      <div class="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
        {successMessage}
      </div>
    {/if}

    <!-- Error Message -->
    {#if submitError}
      <div class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
        {submitError}
      </div>
    {/if}
    
    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
      <!-- Name Field -->
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
          Full Name *
        </label>
        <input
          type="text"
          id="name"
          bind:value={formData.name}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          placeholder="Enter your full name"
          class:border-red-500={errors.name}
        />
        {#if errors.name}
          <p class="text-red-500 text-sm mt-1">{errors.name}</p>
        {/if}
      </div>
      
      <!-- Email Field -->
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
          Email Address *
        </label>
        <input
          type="email"
          id="email"
          bind:value={formData.email}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          placeholder="Enter your email address"
          class:border-red-500={errors.email}
        />
        {#if errors.email}
          <p class="text-red-500 text-sm mt-1">{errors.email}</p>
        {/if}
      </div>
      
      <!-- WhatsApp Number Field -->
      <div>
        <label for="whatsapp" class="block text-sm font-medium text-gray-700 mb-1">
          WhatsApp Mobile Number *
        </label>
        <div class="flex">
          <span class="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-l-md">
            +91
          </span>
          <input
            type="tel"
            id="whatsapp"
            value={formData.whatsappNumber}
            oninput={handlePhoneInput}
            class="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            placeholder="Enter 10-digit mobile number"
            maxlength="10"
            class:border-red-500={errors.whatsappNumber}
          />
        </div>
        {#if errors.whatsappNumber}
          <p class="text-red-500 text-sm mt-1">{errors.whatsappNumber}</p>
        {/if}
      </div>
      
      <!-- Submit Button -->
      <div class="pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          class="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-medium py-3 px-4 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if isSubmitting}
            <span class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          {:else}
            Download Guide
          {/if}
        </button>
      </div>
    </form>
    
    <div class="mt-4 text-xs text-gray-500 text-center">
      By downloading, you agree to receive updates about our services via email and WhatsApp.
    </div>
  </div>
</Modal>