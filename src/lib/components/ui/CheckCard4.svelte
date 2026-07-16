<script>
	let {
		contents = {}
	} = $props();



</script>

<div
  class="grid grid-cols-2 gap-4 p-2 bg-white max-w-[40rem] relative shadow-md"
>
  <div class="col-span-1 bg-gray-200 flex justify-center items-center mx-auto">
    <img src={contents.profileImg} alt="" class="object-cover" />
  </div>

  <div
    class="flex flex-col gap-[2rem] text-start col-span-1 justify-center px-4"
  >
    <div class="flex flex-col gap-4">
      <div class="relative">
        <img src="/quotes-left.png" alt="" class="absolute left-0 top-0 h-4" />
        <h2 class="font-semibold pl-6 pr-2">
          {contents.quotes}
        </h2>
        <img
          src="/quotes-right.png"
          alt=""
          class="absolute right-0 bottom-0 h-4"
        />
      </div>
      <p>
        {contents.para}
      </p>
    </div>
    <div class="flex flex-col text-end">
      <h2 class="font-semibold">{contents.userName}</h2>
      <p class="typography-body-sm text-subPara">{contents.profileName}</p>
    </div>
  </div>
</div>
