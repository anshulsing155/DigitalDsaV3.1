<script>
  import PopupModal from "./PopupModal.svelte";
  import Check from "./Check.svelte";
  import ReCaptcha from "$lib/components/website/ReCaptcha.svelte";
  import { feedbackYes } from "$lib/stores/stores";
  import { feedbackSchema } from "$lib/formValidationSchema";
  import { page } from "$app/state";

  let hasErrors;
  let showDDSARating = false;
  let uploadedImage = null;
  let successModal = false;
  let errorModal = false;
  let userName = "";
  let userEmail = "";
  let feedbackMsg = "";
  let recaptchaToken = "";
  let recaptchaComponent;

  let feedbackData = {
    userName,
    userEmail,
    feedbackMsg,
    uploadedImage,
    ddsaOptions: page.url.searchParams.getAll("features") ?? [],
    // concentFormation: "",
    ddsaAgainstReview: [],
    ddsaOtherReview: "",
    ddsaRatingDetails: {},
    bankOptions: [],
    bankAgainstReview: "",
    bankOtherReview: "",
    ddsaRatingDetailsId: Number(page.url.searchParams.get("star")) || 0,
    bankRatingDetails: {},
  };

  $effect(() => { feedbackData; });

  $effect(() => {
    if ($feedbackYes == 5 || $feedbackYes == 2) {
      showDDSARating = true;
      feedbackData.ddsaRatingDetailsId = $feedbackYes;
    }
  });
  let isWaiting = false;

  let dsaRating = [
    "Calculators",
    "Planners",
    "Ease of flow",
    "Standard of questions",
    "Awareness of loan processing",
    "Accuracy of loan amount",
    "Information and documents",
    "Blogs",
    "Comparison of Banks",
    "Other",
  ];

  let fileInput = null;

  function triggerFileUpload() {
    if (fileInput) {
      fileInput.click(); // Ensure file input exists before clicking
    }
  }

  async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxSize = 2 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      alert("Invalid file type! Only JPG, PNG, and WEBP are allowed.");
      return;
    }

    if (file.size > maxSize) {
      alert("File size exceeds 2MB limit.");
      return;
    }

    feedbackData.uploadedImage = await toBase64(file);
  }

  function removeImage(event) {
    event.stopPropagation(); // Prevent triggering upload when clicking remove button
    feedbackData.uploadedImage = null;
  }

  const toBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const ratingMap = {
    1: {
      label: "Very dissatisfied",
      icon: "fa-face-frown",
      color: "text-dangerColor",
      star: "fa-solid fa-star text-btnBg",
    },
    2: {
      label: "Need Improvement",
      icon: "fa-face-meh",
      color: "text-dangerColor",
      star: "fa-solid fa-star text-btnBg",
    },
    3: {
      label: "Average",
      icon: "fa-face-smile",
      color: "text-btnBg",
      star: "fa-solid fa-star text-btnBg",
    },
    4: {
      label: "Very Good",
      icon: "fa-face-laugh",
      color: "text-btnBg",
      star: "fa-solid fa-star text-btnBg",
    },
    5: {
      label: "Excellent",
      icon: "fa-face-grin-stars",
      color: "text-btnBg",
      star: "fa-solid fa-star text-btnBg",
    },
  };

  function ddsaStar(event) {
    showDDSARating = true;
    feedbackData.ddsaRatingDetailsId = parseInt(event.target.id);
    feedbackData.ddsaRatingDetails = {
      ratingNumber: feedbackData.ddsaRatingDetailsId,
      label: ratingMap?.[Number(feedbackData.ddsaRatingDetailsId)]?.label || "",
    };
  }

  function handleToken(event) {
    recaptchaToken = event.detail.token;
  }

  let errors = {};
  const submitFeedback = async () => {
    const result = feedbackSchema.safeParse(
      Object.fromEntries(Object.entries(feedbackData).slice(0, 3))
    );

    if (!result.success) {
      errors = result.error.format();
      return;
    }

    if (!recaptchaToken) {
      errors.recaptcha = {
        _errors: ["Please complete the reCAPTCHA checkbox"],
      };
      return;
    }

    isWaiting = true;
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...feedbackData,
          "g-recaptcha-response": recaptchaToken,
        }),
      });

      const result = await response.json();

      if (result.success) {
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

  let modalIcon;
  $effect(() => {
    if (feedbackData.ddsaRatingDetailsId > 3) {
      modalIcon = "/pngs/fun.png";
    } else {
      modalIcon = "/pngs/sad.png";
    }
  });</script>

<PopupModal
  isOpen={successModal}
  content={{
    title: "Thank You!",
    subTitle: "Thanks for your feedback.",
    icon: modalIcon,
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

<section>
  <div class="space-y-6 w-full mx-auto">
    <div class="flex flex-col gap-2 py-5">
      <h2
        class="md:text-center font-ThirdHead text-mobSubHead md:text-miniHeadFont lg:text-minHeadFont"
      >
        Feedback matters!
      </h2>
      <p class="font-Paragraph text-subParaFont md:w-[50%] mx-auto">
        We value your feedback to help us improve our portal and services.
        Please take a moment to share your thoughts and suggestions.
      </p>
    </div>

    <form
      method="post"
      onsubmit={(e) => { e.preventDefault(); (submitFeedback)(e); }}
      class="w-full md:w-[70%] mx-auto"
    >
      <div class="flex flex-col gap-[2rem] justify-between w-full mx-auto">
        <div class="flex flex-col gap-2 justify-start md:justify-center">
          <h2
            class="font-FifthHead text-paraFont md:text-subParaFont text-start md:text-center"
          >
            How would you rate your overall experience with the Digital DSA
            service?
          </h2>
          <div
            class="flex w-full gap-4 justify-start md:justify-center mx-auto"
          >
            <div class="cursor-pointer text-paraFont md:text-mobSubHead">
              {#each [1, 2, 3, 4, 5] as star}
                <button type="button" onclick={ddsaStar}>
                  <i
                    class={feedbackData.ddsaRatingDetailsId >= star
                      ? ratingMap[star].star
                      : "fa-regular fa-star text-btnBg"}
                    id={star}
                  ></i>
                </button>
              {/each}
            </div>

            {#if showDDSARating && feedbackData.ddsaRatingDetailsId >= 1}
              <div
                class={`text-paraFont md:text-mobSubHead ${ratingMap[feedbackData.ddsaRatingDetailsId]?.color}`}
              >
                <span
                  ><i
                    class={`fa-solid ${ratingMap[feedbackData.ddsaRatingDetailsId]?.icon}`}
                  ></i></span
                >
                <span
                  class="font-FifthHead text-subParaFont md:text-paraFont align-middle"
                >
                  {ratingMap[feedbackData.ddsaRatingDetailsId]?.label}
                </span>
              </div>
            {/if}
          </div>
        </div>

        {#if feedbackData.ddsaRatingDetailsId > 3}
          <div class="flex flex-col gap-2 text-start md:text-center">
            <div class="flex flex-col gap-1">
              <h2 class="font-FifthHead text-subParaFont">
                That's great! What features do you find most useful?
              </h2>
              <p class="font-Paragraph text-minParaFont">
                (We’d love to hear your feedback, we'll feature it as a
                testimonial on our web app!)
              </p>
            </div>
            <div
              class="grid md:grid-cols-2 gap-2 md:gap-4 items-start w-full mx-auto"
            >
              {#each dsaRating as rating}
                <Check
                  groupName="rating"
                  groupId={rating}
                  bind:groupVal={feedbackData.ddsaOptions}
                  groupValue={[rating]}
                />
              {/each}
              {#if feedbackData.ddsaOptions.includes("Other")}
                <div class="col-span-2">
                  <div class="relative flex items-start">
                    <textarea
                      name="ddsaOther"
                      bind:value={feedbackData.ddsaOtherReview}
                      id="ddsaOther"
                      class="border-1 peer block w-full appearance-none rounded border border-[#0000003A] bg-white py-[0.8rem] pl-[3rem] pr-4 font-Paragraph text-paraFont resize-none text-black outline-none focus:border-btnBg focus:ring-0"
                      placeholder=" "
                      rows="3"
                    />
                    <label
                      for="ddsaOther"
                      class="absolute left-11 top-1 z-10 origin-[0] -translate-y-4 scale-75 transform cursor-text select-none bg-transparent bg-white px-2 font-Paragraph text-paraFont text-gray-500 duration-300 peer-placeholder-shown:top-1 peer-focus:text-btnBg"
                    >
                      Other
                    </label>
                    <div
                      class="absolute top-0 left-0 flex h-full w-11 items-center justify-center rounded-l-md px-2 font-FifthHead text-black"
                    >
                      <img src="/icons/msgBg.svg" alt="mail" class="h-5" />
                    </div>
                  </div>
                </div>
              {/if}
            </div>
          </div>
        {:else if feedbackData.ddsaRatingDetailsId > 0 && feedbackData.ddsaRatingDetailsId <= 3}
          <div class="flex flex-col gap-2 text-start md:text-center">
            <h2 class="font-FifthHead text-subParaFont">
              {#if feedbackData.ddsaRatingDetailsId == 1}
                <span
                  >We regret that we couldn't satisfy your requirements😒;</span
                >
              {:else}
                <span>Your feedback is incredibly important to us;</span>
              {/if}
              What features do you think
              <span class="underline underline-offset-4">need improvement</span
              >?
            </h2>
            <div
              class="grid md:grid-cols-2 gap-2 md:gap-4 items-start w-full mx-auto"
            >
              {#each dsaRating as rating}
                <Check
                  groupName="rating"
                  groupId={rating}
                  bind:groupVal={feedbackData.ddsaOptions}
                  groupValue={[rating]}
                />
              {/each}
              {#if feedbackData.ddsaOptions.includes("Other")}
                <div class="col-span-2">
                  <div class="relative flex items-start">
                    <textarea
                      name="ddsaOther"
                      bind:value={feedbackData.ddsaOtherReview}
                      id="ddsaOther"
                      class="border-1 peer block w-full appearance-none rounded border border-[#0000003A] bg-white py-[0.8rem] pl-[3rem] pr-4 font-Paragraph text-paraFont resize-none text-black outline-none focus:border-btnBg focus:ring-0"
                      placeholder=" "
                      rows="3"
                    />
                    <label
                      for="ddsaOther"
                      class="absolute left-11 top-1 z-10 origin-[0] -translate-y-4 scale-75 transform cursor-text select-none bg-transparent bg-white px-2 font-Paragraph text-paraFont text-gray-500 duration-300 peer-placeholder-shown:top-1 peer-focus:text-btnBg"
                    >
                      Other
                    </label>
                    <div
                      class="absolute top-0 left-0 flex h-full w-11 items-center justify-center rounded-l-md px-2 font-FifthHead text-black"
                    >
                      <img src="/icons/msgBg.svg" alt="mail" class="h-5" />
                    </div>
                  </div>
                </div>
              {/if}
            </div>
          </div>
        {/if}

        {#if feedbackData.ddsaOptions.length > 0}
          {#if feedbackData.ddsaRatingDetailsId > 2}
            <div class="flex flex-col justify-start gap-2">
              <label class="relative group w-24 h-24 block cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  class="hidden"
                  bind:this={fileInput}
                  onchange={handleImageUpload}
                />

                {#if feedbackData.uploadedImage}
                  <img
                    src={feedbackData.uploadedImage}
                    alt="Uploaded Preview"
                    class="w-full h-full object-cover rounded-full shadow-md border border-btnBg transition-all"
                  />

                  <!-- Remove Button -->
                  <button
                    type="button"
                    onclick={removeImage}
                    class="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full shadow hidden group-hover:block transition"
                  >
                    <i class="fa-solid fa-trash"></i>
                  </button>
                {:else}
                  <div
                    class="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 text-3xl rounded-full ring-2 ring-btnBg transition-all"
                  >
                    <i class="fa-solid fa-user"></i>
                  </div>
                {/if}
              </label>

              <!-- Clickable "Upload Image" Text -->
              <div
                role="button"
                tabindex="0"
                onclick={triggerFileUpload}
                onkeydown={(e) =>
                  (e.key === "Enter" || e.key === " ") && triggerFileUpload()}
                aria-label="Upload Image"
                class="font-FifthHead text-subParaFont md:text-paraFont text-start cursor-pointer"
              >
                Upload Image <br />
                <span class="font-SubPara text-[0.6rem]">
                  (2MB & Only JPG, PNG, or WEBP are allowed.)
                </span>
              </div>
            </div>
          {/if}

          <div>
            <div class="relative flex items-center">
              <input
                type="text"
                name="userName"
                bind:value={feedbackData.userName}
                class="border-1 peer block w-full appearance-none rounded border border-[#0000003A] bg-white py-[0.8rem] pl-[3rem] pr-4 font-Paragraph text-paraFont text-black outline-none focus:border-btnBg focus:ring-0 bg-transparent"
              />
              <label
                for="userName"
                class="absolute left-11 top-1 z-10 origin-[0] -translate-y-4 scale-75 transform cursor-text select-none bg-transparent bg-white px-2 font-Paragraph text-paraFont text-gray-500 duration-300 peer-placeholder-shown:top-1 peer-focus:text-btnBg"
              >
                Enter name
              </label>
              <div
                class="absolute left-0 flex h-full w-11 items-center justify-center rounded-l-md px-2 font-FifthHead text-black"
              >
                <img src="/icons/userBg.svg" alt="user" class="h-5" />
              </div>
            </div>
            {#if errors.userName}
              <p
                class="text-dangerColor font-SubPara text-minParaFont text-start"
              >
                {errors.userName._errors[0]}
              </p>
            {/if}
          </div>

          <div>
            <div class="relative flex items-center">
              <input
                type="text"
                name="userEmail"
                bind:value={feedbackData.userEmail}
                class="border-1 peer block w-full appearance-none rounded border border-[#0000003A] bg-white py-[0.8rem] pl-[3rem] pr-4 font-Paragraph text-paraFont text-black outline-none focus:border-btnBg focus:ring-0"
                placeholder=" "
              />
              <label
                for="userEmail"
                class="absolute left-11 top-1 z-10 origin-[0] -translate-y-4 scale-75 transform cursor-text select-none bg-transparent bg-white px-2 font-Paragraph text-paraFont text-gray-500 duration-300 peer-placeholder-shown:top-1 peer-focus:text-btnBg"
              >
                Enter email
              </label>
              <div
                class="absolute left-0 flex h-full w-11 items-center justify-center rounded-l-md px-2 font-FifthHead text-black"
              >
                <img src="/icons/mailBg.svg" alt="mail" class="h-5" />
              </div>
            </div>
            {#if errors.userEmail}
              <p
                class="text-dangerColor font-SubPara text-minParaFont text-start"
              >
                {errors.userEmail._errors[0]}
              </p>
            {/if}
          </div>

          {#if !feedbackData.ddsaOptions.includes("Other")}
            <div class="flex flex-col gap-1">
              <div>
                <div class="relative flex items-start">
                  <textarea
                    name="message"
                    bind:value={feedbackData.feedbackMsg}
                    id="message"
                    class="border-1 peer block w-full appearance-none rounded border border-[#0000003A] bg-white py-[0.8rem] pl-[3rem] pr-4 font-Paragraph text-paraFont resize-none text-black outline-none focus:border-btnBg focus:ring-0"
                    placeholder=" "
                    rows="6"
                  />
                  <label
                    for="message"
                    class="absolute left-11 top-1 z-10 origin-[0] -translate-y-4 scale-75 transform cursor-text select-none bg-transparent bg-white px-2 font-Paragraph text-paraFont text-gray-500 duration-300 peer-placeholder-shown:top-1 peer-focus:text-btnBg"
                  >
                    Message
                  </label>
                  <div
                    class="absolute top-0 left-0 flex h-full w-11 items-center justify-center rounded-l-md px-2 font-FifthHead text-black"
                  >
                    <img src="/icons/msgBg.svg" alt="mail" class="h-5" />
                  </div>
                </div>
                {#if errors.feedbackMsg}
                  <p
                    class="text-dangerColor font-SubPara text-minParaFont text-start"
                  >
                    {errors.feedbackMsg._errors[0]}
                  </p>
                {/if}
              </div>

              {#if feedbackData.ddsaRatingDetailsId >= 4}
                <div class="text-start">
                  <p class="font-Paragraph text-subParaFont">
                    We may showcase your feedback as a testimonial
                    {#if !feedbackData.uploadedImage}
                      if you provide a profile image.
                    {:else}
                      .
                    {/if}
                  </p>
                </div>
              {/if}

              <!-- {#if feedbackData.ddsaRatingDetailsId == 5}
                <div class="">
                  <SingleCheck
                    bind:groupVal={feedbackData.concentFormation}
                    groupName="consent"
                    value="Yes"
                    labelText="Would you like us to feature your feedback as a testimonial?"
                  />
                </div>
              {/if} -->
            </div>
          {/if}
        {/if}
      </div>

      {#if feedbackData.userName && feedbackData.userEmail}
        <div class=" my-5 w-full mx-auto space-y-6">
          <div class=" grid place-content-end">
            <ReCaptcha ontoken={handleToken} bind:this={recaptchaComponent} />
          </div>
          {#if errors.recaptcha}
            <p
              class="text-dangerColor font-SubPara text-minParaFont text-center"
            >
              {errors.recaptcha._errors[0]}
            </p>
          {/if}

          {#if isWaiting}
            <button
              type="button"
              class="text-black bg-btnBg hover:opacity-80 focus:ring-2 focus:outline-none font-Paragraph text-minParaFont md:text-subParaFont rounded-lg text-sm w-full px-5 py-2.5 text-center"
              disabled
            >
              <div class="flex text-center justify-center items-center">
                <div class="loader"></div>
              </div>
            </button>
          {:else}
            <button
              type="submit"
              class="text-black bg-btnBg hover:opacity-80 focus:ring-2 focus:outline-none font-Paragraph text-minParaFont md:text-subParaFont rounded-lg text-sm w-full px-5 py-2.5 text-center"
              disabled={hasErrors || !recaptchaToken}
            >
              Submit
            </button>
          {/if}
        </div>
      {/if}
    </form>
  </div>
</section>

<style>
  input[type="file"] {
    display: none;
  }
  .fade-enter-active {
    animation: fade-in 0.5s ease-out;
  }
  .loader {
    width: 20px;
    aspect-ratio: 1;
    display: grid;
    border-radius: 50%;
    background:
      linear-gradient(0deg, rgb(0 0 0/50%) 30%, #0000 0 70%, rgb(0 0 0/100%) 0)
        50%/8% 100%,
      linear-gradient(90deg, rgb(0 0 0/25%) 30%, #0000 0 70%, rgb(0 0 0/75%) 0)
        50%/100% 8%;
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
  input:-webkit-autofill {
    -webkit-box-shadow: 0 0 0px 1000px white inset !important;
    -webkit-text-fill-color: #000 !important;
    transition: background-color 5000s ease-in-out 0s;
  }
  input:-moz-autofill {
    box-shadow: 0 0 0px 1000px white inset !important;
    color: #000 !important;
  }
  @keyframes fade-in {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }
</style>
