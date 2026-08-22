import wixWindow from 'wix-window';

$w.onReady(function () {
    const context = wixWindow.lightbox.getContext();

    if (context) {
        $w("#reviewPlayerName").text = `${context.firstName || ""} ${context.lastName || ""}`.trim();
        $w("#reviewParentName").text = context.parentName || "No Parent Name Found";
        $w("#reviewParentEmail").text = context.parentEmail || "No Email Found";
    }

    $w("#tasterDate").value = null;
    $w("#regDate").value = null;
    $w("#regPlayertype").value = null;

    $w("#btnCancelInvite").onClick(() => {
        wixWindow.lightbox.close();
    });

    $w("#btnSendInvite").onClick(() => {
        const tasterDate = $w("#tasterDate").value;
        const regDate = $w("#regDate").value;
        const playerType = $w("#regPlayertype").value;

        if (!tasterDate || !regDate || !playerType) {
            $w("#btnSendInvite").label = "Fill all fields!";
            setTimeout(() => $w("#btnSendInvite").label = "Send Registration Link", 2000);
            return;
        }

        wixWindow.lightbox.close({ tasterDate, regDate, playerType });
    });
});
