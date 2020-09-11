//jQuery time
var current_fs, next_fs, previous_fs; //fieldsets
var left, opacity, scale; //fieldset properties which we will animate
var animating; //flag to prevent quick multi-click glitches

$('.next').click(function () {
	if (animating) return false;
	animating = true;

	current_fs = $(this).parent();
	next_fs = $(this).parent().next();

	//activate next step on progressbar using the index of next_fs
	$('#progressbar li').eq($('fieldset').index(next_fs)).addClass('active');

	//show the next fieldset
	next_fs.show();
	//hide the current fieldset with style
	current_fs.animate(
		{ opacity: 0 },
		{
			step: function (now, mx) {
				//as the opacity of current_fs reduces to 0 - stored in "now"
				//1. scale current_fs down to 80%
				scale = 1 - (1 - now) * 0.2;
				//2. bring next_fs from the right(50%)
				left = now * 50 + '%';
				//3. increase opacity of next_fs to 1 as it moves in
				opacity = 1 - now;
				current_fs.css({
					transform: 'scale(' + scale + ')',
					position: 'relative',
				});
				next_fs.css({ left: left, opacity: opacity });
			},
			duration: 800,
			complete: function () {
				current_fs.hide();
				animating = false;
			},
			//this comes from the custom easing plugin
			easing: 'easeInOutBack',
		}
	);
});

$('.previous').click(function () {
	if (animating) return false;
	animating = true;

	current_fs = $(this).parent();
	previous_fs = $(this).parent().prev();

	//de-activate current step on progressbar
	$('#progressbar li')
		.eq($('fieldset').index(current_fs))
		.removeClass('active');

	//show the previous fieldset
	previous_fs.show();
	//hide the current fieldset with style
	current_fs.animate(
		{ opacity: 0 },
		{
			step: function (now, mx) {
				//as the opacity of current_fs reduces to 0 - stored in "now"
				//1. scale previous_fs from 80% to 100%
				scale = 0.8 + (1 - now) * 0.2;
				//2. take current_fs to the right(50%) - from 0%
				left = (1 - now) * 50 + '%';
				//3. increase opacity of previous_fs to 1 as it moves in
				opacity = 1 - now;
				current_fs.css({ left: left });
				previous_fs.css({
					transform: 'scale(' + scale + ')',
					opacity: opacity,
				});
			},
			duration: 800,
			complete: function () {
				current_fs.hide();
				animating = false;
			},
			//this comes from the custom easing plugin
			easing: 'easeInOutBack',
		}
	);
});

$('.submit').click(function () {
	return false;
});

//REMOVE element
const removeButton = () => {
	$('.btn-remove').click(function () {
		$(this).parent().remove();
	});
};

removeButton();
//ADD element
$('.action--add__email-dev').click(function () {
	const numEmails = $(this)
		.parent()
		.parent()
		.find('.form__group.row input[name="email"]').length;
	const elementEmail = `<div class="form__group form-group row"><input class="col-sm-10 form__input dev_email" type="text" name="email" id="email_${
		numEmails + 1
	}" placeholder="chandlier.bing@honeywell.com"><input class="col-sm-1 btn btn-danger btn-remove" type="button" name="remove" value="REMOVE"></div>`;
	if ($(this).attr('name') === 'add_email') {
		$(elementEmail).insertBefore($(this).parent());
		removeButton();
	}
});
$('.action--add__email-qa').click(function () {
	const numEmails = $(this)
		.parent()
		.parent()
		.find('.form__group.row input[name="email"]').length;
	const elementEmail = `<div class="form__group form-group row"><input class="col-sm-10 form__input qa_email" type="text" name="email" id="email_${
		numEmails + 1
	}" placeholder="chandlier.bing@honeywell.com"><input class="col-sm-1 btn btn-danger btn-remove" type="button" name="remove" value="REMOVE"></div>`;
	if ($(this).attr('name') === 'add_email') {
		$(elementEmail).insertBefore($(this).parent());
		removeButton();
	}
});
$('.action--add__email-stage').click(function () {
	const numEmails = $(this)
		.parent()
		.parent()
		.find('.form__group.row input[name="email"]').length;
	const elementEmail = `<div class="form__group form-group row"><input class="col-sm-10 form__input stage_email" type="text" name="email" id="email_${
		numEmails + 1
	}" placeholder="chandlier.bing@honeywell.com"><input class="col-sm-1 btn btn-danger btn-remove" type="button" name="remove" value="REMOVE"></div>`;
	if ($(this).attr('name') === 'add_email') {
		$(elementEmail).insertBefore($(this).parent());
		removeButton();
	}
});
$('.action--add__email-prod').click(function () {
	const numEmails = $(this)
		.parent()
		.parent()
		.find('.form__group.row input[name="email"]').length;
	const elementEmail = `<div class="form__group form-group row"><input class="col-sm-10 form__input prod_email" type="text" name="email" id="email_${
		numEmails + 1
	}" placeholder="chandlier.bing@honeywell.com"><input class="col-sm-1 btn btn-danger btn-remove" type="button" name="remove" value="REMOVE"></div>`;
	if ($(this).attr('name') === 'add_email') {
		$(elementEmail).insertBefore($(this).parent());
		removeButton();
	}
});

$('.action--add__page-dev').click(function () {
	const UrlCount = $(this)
		.parent()
		.parent()
		.find('.form__group.row input[name="url"]').length;

	const elementUrl = `<div class="form__group form-group row"><input class="col-sm-10 form__input dev_url" type="text" name="url" id="dev_url_${
		UrlCount + 1
	}" placeholder="https://stage.honeywell.com/en-us/in-the-news"><input class="col-sm-1 btn btn-danger btn-remove" type="button" name="remove" value="REMOVE"></div>`;

	if ($(this).attr('name') === 'add_page') {
		$(elementUrl).insertBefore($(this).parent());
		removeButton();
	}
});

$('.action--add__page-qa').click(function () {
	const UrlCount = $(this)
		.parent()
		.parent()
		.find('.form__group.row input[name="url"]').length;

	const elementUrl = `<div class="form__group form-group row"><input class="col-sm-10 form__input qa_url" type="text" name="url" id="qa_url_${
		UrlCount + 1
	}" placeholder="https://stage.honeywell.com/en-us/in-the-news"><input class="col-sm-1 btn btn-danger btn-remove" type="button" name="remove" value="REMOVE"></div>`;

	if ($(this).attr('name') === 'add_page') {
		$(elementUrl).insertBefore($(this).parent());
		removeButton();
	}
});

$('.action--add__page-stage').click(function () {
	const UrlCount = $(this)
		.parent()
		.parent()
		.find('.form__group.row input[name="url"]').length;

	const elementUrl = `<div class="form__group form-group row"><input class="col-sm-10 form__input stage_url" type="text" name="url" id="stage_url_${
		UrlCount + 1
	}" placeholder="https://stage.honeywell.com/en-us/in-the-news"><input class="col-sm-1 btn btn-danger btn-remove" type="button" name="remove" value="REMOVE"></div>`;

	if ($(this).attr('name') === 'add_page') {
		$(elementUrl).insertBefore($(this).parent());
		removeButton();
	}
});

$('.action--add__page-prod').click(function () {
	const UrlCount = $(this)
		.parent()
		.parent()
		.find('.form__group.row input[name="url"]').length;

	const elementUrl = `<div class="form__group form-group row"><input class="col-sm-10 form__input prod_url" type="text" name="url" id="prod_url_${
		UrlCount + 1
	}" placeholder="https://stage.honeywell.com/en-us/in-the-news"><input class="col-sm-1 btn btn-danger btn-remove" type="button" name="remove" value="REMOVE"></div>`;

	if ($(this).attr('name') === 'add_page') {
		$(elementUrl).insertBefore($(this).parent());
		removeButton();
	}
});

// Invoke carousel
$('.carousel').carousel({
	interval: 90000,
	pause: 'hover',
});
