<script lang="ts">
	interface Props {
		sideImage?: any;
		heading: any;
		enquiry?: EnquiryType;
	}

	let {
		sideImage = "/icons/computerAndMobile.svg",
		heading,
		enquiry = {}
	}: Props = $props();


  import { page } from "$app/state";
  import { fly } from "svelte/transition";
  import { contactSchema } from "$lib/formValidationSchema";
  import ToastStack from '$lib/components/sections/Toast.svelte';
  import { alertNotification } from "$lib/stores/stores";
  const notificationStore: any = alertNotification;
  import PopupModal from '../modals/PopupModal.svelte';
  import ReCaptcha from './ReCaptcha.svelte';
  import { onMount } from "svelte";
  import NewPopUp from '../modals/NewPopUp.svelte';
  import NewSelect from '../ui/NewSelect.svelte';
  import InputField from '../ui/InputField.svelte';



  interface EnquiryType {
    [key: string]: string[];
  }



  let selectedEnquiry = $state("");
  let selectedSubCategory = $state("");
  let successModal = $state(false);
  let errorModal = $state(false);
  let otp = $state(["", "", "", ""]);
  let otpCode = $derived(otp.join(""));
  let lastOtpSent = $state(0);
  const OTP_COOLDOWN = 30000;
  let requestId = $state("");
  let widgetData = $state<any>(null);

  let activeState = $state({
    isOtpSent: false,
    otpVerified: false,
  });

  $effect(() => {
		if (selectedEnquiry) {
    selectedSubCategory = "";
  		}
	});
  let errors = $state<any>({});
  $effect(() => { errors; });
  let feedbackData = $state({
    userSubject: "",
    userName: "",
    userMobile: "",
    feedbackMsg: "",
  });

  $effect(() => { feedbackData.feedbackMsg; });

  let mobileIntoString = $derived(page.data.user?.mobileNumber ?? "");

  $effect(() => { feedbackData.userName = page.data.user?.name ?? feedbackData.userName; });
  $effect(() => { feedbackData.userMobile = mobileIntoString ? String(mobileIntoString) : ""; });

  $effect(() => { feedbackData.userSubject =
    selectedEnquiry === "Other"
? selectedEnquiry
: selectedEnquiry && selectedSubCategory
? `${selectedEnquiry}/${selectedSubCategory}`
: selectedEnquiry; });

  let recaptchaToken = $state("");
  let recaptchaComponent = $state<any>(null);
  let isWaiting = $state(false);

  $effect(() => { feedbackData; });

  function handleToken(event: any) {
    recaptchaToken = event.detail.token;
  }

  function validateMobile(event: any) {
    let value = event.target.value.replace(/\D/g, ""); // Remove non-numeric characters
    feedbackData.userMobile = value.slice(0, 10); // Limit input to 10 digits

    const result = contactSchema.safeParse({
userMobile: feedbackData.userMobile,
    });

    if (!result.success) {
errors.userMobile = result.error.format().userMobile;
    } else {
errors.userMobile = null;
    }
  }

  let hasErrors = $derived(Object.values(errors).some(
    (error: any) => Array.isArray(error?._errors) && error._errors.length > 0
  ));

  const submitFeedback = async () => {
    const result = contactSchema.safeParse(
Object.fromEntries(Object.entries(feedbackData).slice(0, 4))
    );

    if (!result.success) {
errors = { ...result.error.format() };
return;
    }

    if (!recaptchaToken) {
errors = {
...errors,
recaptcha: { _errors: ["Please complete the reCAPTCHA checkbox"] },
};
return;
    }

    errors = {};
    isWaiting = true;
    try {
const response = await fetch("/api/contact", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
...feedbackData,
"g-recaptcha-response": recaptchaToken,
}),
});

const result = await response.json();

if (result.success) {
errors = {};
recaptchaToken = "";
successModal = true;
} else {
errorModal = true;
}
document.body.style.overflow = "hidden";
    } catch (error) {
console.error("Error submitting feedback:", error);
errorModal = true;
document.body.style.overflow = "hidden";
window.location.reload();
    } finally {
isWaiting = false;
recaptchaComponent?.reset();
    }
  };

  async function sendOTP() {
    // if (errors.userMobile) return;

    const now = Date.now();
    if (now - lastOtpSent < OTP_COOLDOWN) {
showAlert(
"Please wait before requesting another OTP",
3000,
"text-dangerColor"
);
return;
    }

    isWaiting = true;
    if (errors.userMobile) {
showAlert(errors.userMobile, 3000, "text-dangerColor");
isWaiting = false;
return;
    }

    if (!widgetData) {
showAlert(
"Authentication service not initialized. Please refresh the page.",
3000,
"text-dangerColor"
);
isWaiting = false;
return;
    }

    try {
const response = await fetch("/api/Auth/send-otp", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ mobileNumber: feedbackData.userMobile }),
});

const result = await response.json();

if (!response.ok) {
throw new Error(result.message || "Failed to send OTP");
}

if (result.success === true) {
if (result.requestId) {
requestId = result.requestId;
} else {
showAlert(
"OTP sent, but request ID is missing. Retry if verification fails.",
3000,
"text-yellow-500"
);
}
activeState.isOtpSent = true;
startCountdown();
lastOtpSent = now;
showAlert("OTP sent successfully", 3000, "text-green-500");
} else {
throw new Error(result.message || "Failed to send OTP");
}
    } catch (error) {
showAlert("Failed to send OTP", 3000, "text-dangerColor");
    } finally {
isWaiting = false;
    }
  }

  async function verifyOTP() {
    isWaiting = true;
    otpCode = otp.map((digit) => digit.replace(/\D/g, "").slice(0, 1)).join("");

    if (!otpCode || otpCode.length !== 4) {
showAlert("Please enter a valid 4-digit OTP", 3000, "text-dangerColor");
isWaiting = false;
return;
    }

    if (!requestId) {
showAlert(
"Request ID is missing. Please request a new OTP.",
3000,
"text-dangerColor"
);
isWaiting = false;
return;
    }

    if (!widgetData) {
showAlert(
"Authentication service not initialized. Please refresh the page.",
3000,
"text-dangerColor"
);
isWaiting = false;
return;
    }

    try {
const response = await fetch("/api/Auth/verify-otp", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
otpCode,
reqId: requestId,
mobileNumber: feedbackData.userMobile,
}),
});
const result = await response.json();

if (!response.ok || !result.success) {
throw new Error(result.error || "OTP verification failed");
}

if (!result.userExists) {
// activeState.register = true;
activeState.isOtpSent = false;
isWaiting = false;
return;
}

showAlert("You're verified!", 3000, "text-green-500");
activeState.isOtpSent = false;
    } catch (error) {
showAlert("Invalid OTP. Please try again.", 3000, "text-dangerColor");
    } finally {
isWaiting = false;
    }
  }

  async function retryOTP() {
    if (!requestId) {
showAlert(
"Request ID is missing. Please request a new OTP.",
3000,
"text-dangerColor"
);
return;
    }

    if (!widgetData) {
showAlert(
"Authentication service not initialized. Please refresh the page.",
3000,
"text-dangerColor"
);
return;
    }

    try {
const response = await fetch("/api/Auth/resend-otp", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
reqId: requestId,
mobileNumber: feedbackData.userMobile,
}),
});

const result = await response.json();

if (!response.ok || !result.success) {
throw new Error(result.error || "Failed to resend OTP");
}

requestId = result.requestId || requestId; // Fix: Use result.requestId, not result.message
startCountdown();
showAlert("OTP resent successfully", 3000, "text-green-500");
    } catch (error) {
showAlert("Failed to resend OTP", 3000, "text-dangerColor");
    }
  }

  let countdown = $state(30);
  let isResendDisabled = $state(true);
  function startCountdown() {
    isResendDisabled = true;
    countdown = 30;
    const timer = setInterval(() => {
if (countdown > 0) countdown--;
else {
clearInterval(timer);
isResendDisabled = false;
}
    }, 1000);
  }

  function updateDigit(index: any, event: any) {
    const value = event.target.value.replace(/\D/g, "").slice(0, 1);
    otp[index] = value;
    if (value && index < otp.length - 1) {
document.getElementById(`otp-input-${index + 1}`)?.focus();
    }
  }

  function handleBackspace(index: any, event: any) {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
document.getElementById(`otp-input-${index - 1}`)?.focus();
otp[index - 1] = "";
    }
  }

  onMount(async () => {
    try {
const response = await fetch("/api/Auth/init-widget");
const result = await response.json();

if (result.success) {
widgetData = result.widgetData;
} else {
throw new Error(result.error || "Failed to initialize widget");
}
    } catch (error) {
showAlert(
"Failed to initialize authentication service. Please refresh the page.",
3000,
"text-dangerColor"
);
    }
  });

  function handleEnter(event: any, action: any) {
    if (event.key === "Enter") action();
  }

  export function showAlert(
    message: string,
    duration: number = 3000,
    color: string = "text-green-500"
  ) {
    notificationStore.set({ message, color });

    setTimeout(() => {
notificationStore.set(null);
    }, duration);
  }
</script>

<PopupModal
  isOpen={successModal}
  content={{
    title: "We Got You!",
    subTitle: `Thank you for reaching out! <br/> We've received your message and will get back to you soon.`,
    icon: "/pngs/fun.png",
    altName: "fun-emoji",
  }}
  onClose={() => {
    successModal = false;
    window.location.reload();
  }}
/>

<PopupModal
  isOpen={errorModal}
  content={{
    title: "Sorry!",
    subTitle: "Something went wrong. Please try again.",
    icon: "/pngs/sad.png",
    altName: "sad-emoji",
  }}
  onClose={() => {
    errorModal = false;
    window.location.reload();
  }}
/>

<section class="flex flex-col gap-10 py-[2rem]">
  <ToastStack />

  <div class="grid md:grid-cols-2">
    <div class="flex flex-col gap-5 md:col-span-1">
      <h2 class="typography-h3 font-semibold md:typography-h2-md">
        {heading}
      </h2>

      <div class="flex flex-col gap-2">
        <NewSelect
          placeholder="Choose your enquiry"
          options={Object.keys(enquiry)}
          bind:selectedValue={selectedEnquiry}
          icon="/icons/enquiry-icon.png"
          iconBg="bg-transparent"
          optionListClass="hover:bg-darkColor hover:text-white"
        />
      </div>

      {#if selectedEnquiry != "Other" && selectedEnquiry != ""}
        <div class="flex flex-col gap-2">
          <NewSelect
            placeholder="Choose your sub-category"
            options={enquiry[selectedEnquiry] || []}
            bind:selectedValue={selectedSubCategory}
            icon="/icons/subCateg.svg"
            iconBg="bg-transparent"
            optionListClass="hover:bg-darkColor hover:text-white"
          />
        </div>
      {/if}
      <form
        method="POST"
        onsubmit={(e) => { e.preventDefault(); submitFeedback(); }}
        class="flex flex-col gap-4"
      >
        {#if selectedSubCategory || selectedEnquiry == "Other"}
          <div class="flex flex-col gap-4">
            <div>
              <div class="relative flex items-start">
                <textarea
                  name="message"
                  bind:value={feedbackData.feedbackMsg}
                  oninput={() => {
                    if (errors.feedbackMsg) {
                      errors = { ...errors, feedbackMsg: ""};
                    }
                  }}
                  id="message"
                  class="border-1 peer block w-full appearance-none border border-[#0000003A] bg-white py-[0.6rem] pl-[3rem] pr-4 typography-body-sm text-[var(--form-text-secondary)] md:typography-body-md resize-none text-black outline-none focus:border-[var(--form-border)] focus:ring-0"
                  placeholder="Describe your query atleast in 20 characters and 5 words."
                  rows="6"
                ></textarea>
                <label
                  for="message"
                  class="absolute left-11 top-1 z-10 origin-[0] -translate-y-4 scale-75 transform cursor-text select-none bg-transparent bg-white px-2 typography-body-md text-gray-500 duration-300 peer-placeholder-shown:top-1 peer-focus:text-primary"
                >
                  Describe your query
                </label>
                <div
                  class="absolute top-0 left-0 flex h-full w-11 items-center justify-center px-2 font-semibold text-black"
                >
                  <img src="/icons/mail-icon.png" alt="mail-icon" class="h-5" />
                </div>
              </div>
              {#if errors.feedbackMsg}
                <p
                  class="text-dangerColor typography-body-sm text-start"
                >
                  {errors.feedbackMsg._errors[0]}
                </p>
              {/if}
            </div>

            <div>
              <InputField
                inputType="text"
                name="userName"
                bind:bindValue={feedbackData.userName}
                disabled={page.data.user?.mobileNumber ? true : false}
                label="Enter name"
                iconSrc="/icons/user-icon.png"
                altIcon="user-icon"
              />
              {#if errors.userName}
                <p
                  class="text-dangerColor typography-body-sm text-start"
                >
                  {errors.userName._errors[0]}
                </p>
              {/if}
            </div>

            <div>
              <InputField
                inputType="text"
                name="userMobile"
                bind:bindValue={feedbackData.userMobile}
                onInputHandler={validateMobile}
                onChangeHandler={sendOTP}
                disabled={page.data.user?.mobileNumber ? true : false}
                label="Enter mobile number"
                iconSrc="/icons/phone-icon.svg"
                altIcon="phone-icon"
              />
              {#if errors.userMobile}
                <p
                  class="text-dangerColor typography-body-sm text-start"
                >
                  {errors.userMobile._errors[0]}
                </p>
              {/if}
            </div>

            <div
              class="flex flex-col typography-body-sm text-gray-500"
            >
              <p>We'll contact you.</p>
              <p>Our respective representative will call you on this number.</p>
            </div>

            {#if activeState.isOtpSent}
              <NewPopUp isOpen={activeState.isOtpSent}>
                <div
                  id="Login"
                  class="h-[45%] flex flex-col justify-center items-center"
                  in:fly={{ x: 100, duration: 400 }}
                >
                  <h1 class="font-semibold typography-h3">
                    OTP Verification
                  </h1>
                  <p class="typography-body-sm text-[var(--form-text-secondary)]">
                    Enter the OTP you received at <br /><span
                      class="font-HeadingBold">{feedbackData.userMobile}</span
                    >
                  </p>
                  <div
                    class="w-full pt-5 flex flex-col justify-center items-center"
                  >
                    <div id="otp" class="flex gap-2">
                      {#each otp as digit, index}
                        <input
                          id={`otp-input-${index}`}
                          class="h-12 w-12 rounded border border-[#0000003A] bg-white text-center typography-body-md text-black outline-none focus:border-[var(--form-border)]"
                          type="number"
                          maxlength="1"
                          bind:value={otp[index]}
                          onkeydown={(e) => {
                            handleBackspace(index, e);
                            handleEnter(e, verifyOTP);}}
                          oninput={(e) => updateDigit(index, e)}
                          autocomplete="one-time-code"
                        />
                      {/each}
                    </div>
                    <div class="mt-4 flex w-full justify-center items-center">
                      <button
                        type="button"
                        onclick={() => retryOTP()}
                        onkeydown={(e) => handleEnter(e, retryOTP)}
                        class="font-semibold text-miniSubHead text-[#006EBE]"
                        disabled={isResendDisabled}
                        >{isResendDisabled
                          ? `Resend OTP in ${countdown}s`
                          : "Resend OTP"}</button
                      >
                    </div>
                    <div
                      class="mt-4 flex flex-col gap-2 justify-center items-center w-full"
                    >
                      {#if isWaiting}
                        <button
                          type="button"
                          class="w-full rounded-full px-[2rem] py-3 typography-body-md text-[var(--form-text-secondary)] hover:opacity-90"
                          aria-label="Verifying OTP"
                          ><div class="flex text-center">
                            <div class="loader"></div>
                          </div></button
                        >
                      {:else}
                        <button
                          type="button"
                          onclick={() => {
                            verifyOTP();}}
                          onkeydown={(e) => handleEnter(e, verifyOTP)}
                          class="w-full rounded bg-primary py-[0.7rem] typography-body-md text-[var(--form-text-secondary)] hover:opacity-90"
                          >Verify OTP <span
                            ><i class="fa-regular fa-paper-plane"></i></span
                          ></button
                        >
                      {/if}
                      {#if $notificationStore}
                        <p
                          class="typography-body-sm text-leastMiniFont {$notificationStore.color ||
                            'text-green-500'}"
                        >
                          {$notificationStore.message}
                        </p>
                      {/if}
                    </div>
                  </div>
                </div>
              </NewPopUp>
            {/if}

            <div class="my-5 w-full mx-auto space-y-6">
              <div class="grid place-content-end">
                <ReCaptcha
                  ontoken={handleToken}
                  bind:this={recaptchaComponent}
                />
              </div>

              {#if isWaiting}
                <button
                  type="button"
                  class="text-white bg-gray-200 typography-body-md focus:outline-none typography-body-sm md:typography-body-md w-full px-5 py-2.5 text-center cursor-not-allowed"
                  disabled
                  aria-label="Submitting query"
                >
                  <div class="flex justify-center items-center">
                    <div class="loader"></div>
                  </div>
                </button>
              {:else}
                <button
                  type="submit"
                  class="text-white focus:outline-none typography-body-sm text-[var(--form-text-secondary)] md:typography-body-md w-full px-5 py-2.5 text-center {hasErrors ||
                  !recaptchaToken ||
                  !feedbackData.userMobile ||
                  !feedbackData.feedbackMsg ||
                  !feedbackData.userName
                    ? 'bg-gray-200 cursor-not-allowed'
                    : 'bg-darkColor hover:opacity-80'}"
                  disabled={hasErrors ||
                    !recaptchaToken ||
                    !feedbackData.userMobile ||
                    !feedbackData.feedbackMsg ||
                    !feedbackData.userName}
                >
                  Submit
                </button>
              {/if}
              {#if errors.recaptcha}
                <p
                  class="text-dangerColor typography-body-sm text-center"
                >
                  {errors.recaptcha._errors[0]}
                </p>
              {/if}
            </div>
          </div>
        {/if}
      </form>
    </div>
    <div class="md:col-span-1 justify-self-end">
      <img
        src={sideImage}
        alt="images-computerAndMobile"
        class="hidden md:block"
      />
    </div>
  </div>
</section>

<style>
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    margin: 0;
  }

  .loader {
    width: 20px;
    aspect-ratio: 1;
    display: grid;
    border-radius: 50%;
    background:
      linear-gradient(
          0deg,
          rgb(0 0 0 / 50%) 30%,
          #0000 0 70%,
          rgb(0 0 0 / 100%) 0
        )
        50% / 8% 100%,
      linear-gradient(
          90deg,
          rgb(0 0 0 / 25%) 30%,
          #0000 0 70%,
          rgb(0 0 0 / 75%) 0
        )
        50% / 100% 8%;
    background-repeat: no-repeat;
    animation: l23 1s infinite steps(12);
  }
  .loader::before,
  .loader::after {
    content: "";
    grid-area: 1/1;
    border-radius: 50%;
    background: inherit;
    opacity: 0.915;
    transform: rotate(30deg);
  }
  .loader::after {
    opacity: 0.83;
    transform: rotate(60deg);
  }
  @keyframes l23 {
    100% {
      transform: rotate(1turn);
    }
  }
</style>
