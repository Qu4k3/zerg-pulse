function pulseProgress() {
    $('#pulseStatus').queue(function () {
        $(this).css('width', '100%')
    });
}

pulseProgress()