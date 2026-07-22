import wixWindow from 'wix-window';

$w.onReady(function () {
    const context = wixWindow.lightbox.getContext() || {};

    // context values are true/false/null (never a forced boolean) — null means
    // "never answered", so we leave the radio with no selection instead of
    // defaulting it to No, which would look like an active decision that was
    // never actually made.
    const triStateValue = (val) => {
        if (val === true) return "true";
        if (val === false) return "false";
        return null;
    };
    $w("#radioConsentPhoto").value = triStateValue(context.photo);
    $w("#radioConsentSocial").value = triStateValue(context.social);
    $w("#radioConsentFA").value = triStateValue(context.fa);
    $w("#radioConsentMedical").value = triStateValue(context.medical);

    updateFAWarning();
    updateConfirmButton();

    $w("#radioConsentPhoto").onChange(updateConfirmButton);
    $w("#radioConsentSocial").onChange(updateConfirmButton);
    $w("#radioConsentMedical").onChange(updateConfirmButton);

    $w("#radioConsentFA").onChange(() => {
        updateFAWarning();
        updateConfirmButton();
    });

    $w("#btnConfirmConsent").onClick(() => {
        wixWindow.lightbox.close({
            photo: $w("#radioConsentPhoto").value === "true",
            social: $w("#radioConsentSocial").value === "true",
            fa: $w("#radioConsentFA").value === "true",
            medical: $w("#radioConsentMedical").value === "true"
        });
    });

    function updateFAWarning() {
        if ($w("#radioConsentFA").value === "false") {
            $w("#txtWarningFA").expand();
        } else {
            $w("#txtWarningFA").collapse();
        }
    }

    function updateConfirmButton() {
        const allAnswered = $w("#radioConsentPhoto").value
            && $w("#radioConsentSocial").value
            && $w("#radioConsentFA").value
            && $w("#radioConsentMedical").value;

        if (allAnswered) {
            $w("#btnConfirmConsent").enable();
        } else {
            $w("#btnConfirmConsent").disable();
        }
    }
});
