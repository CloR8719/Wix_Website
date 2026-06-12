import wixWindow from 'wix-window';
import wixData from 'wix-data';

$w.onReady(async function () {
    const res = await wixData.query("AgeGroup").ascending("AG_ageGroup").find();
    $w("#ageGroupDrop").options = res.items.map(a => ({ label: a.AG_ageGroup, value: a._id }));

    $w("#confirmBtn").onClick(() => {
        const name = $w("#teamNameInput").value;
        const age = $w("#ageGroupDrop").value;

        if (name && age) {
            wixWindow.lightbox.close({ name: name, ageGroup: age });
        } else {
            $w("#teamNameInput").placeholder = "Required!";
        }
    });
});