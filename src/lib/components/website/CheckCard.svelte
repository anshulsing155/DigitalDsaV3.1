<script>
	let {
		profileImg = `/testimonialTest.png`,
		para = `Lorem ipsum dolor sit amet consectetur adipisicing elit. Molestiae,
  //     cupiditate.`,
		userName = `Alok Raj Singh`,
		contents = {}
	} = $props();


  //
  //
  //

</script>

<div class="flex flex-col gap-4 p-4 bg-white max-w-[20rem] shadow-md">
  <div class="bg-gray-200">
    <img src={contents.profileImg} alt="" class="h-[20rem] object-cover" />
  </div>
  <div>
    <p>
      {contents.para}
    </p>
    <h2 class="font-FourthHead text-end">{contents.userName}</h2>
  </div>
</div>
