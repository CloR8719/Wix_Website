import wixData from 'wix-data';

$w.onReady(function () {
    
    // This is the part that was missing - the "onReady" wrapper
    $w("#sponsors1").onItemReady(($item, itemData) => {
        // This stops the 'Zoom' and forces the logo to 'Fit' its box
        $item("#sponsorImage").fitMode = "fit"; 
    });

});