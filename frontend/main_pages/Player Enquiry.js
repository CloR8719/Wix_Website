import wixData from 'wix-data';
import wixLocation from 'wix-location';
// 📱 TWILIO SETUP: To disable SMS during testing, add // to the start of the line below
import { notifyManagers } from 'backend/notifications.jsw'; 

$w.onReady(async function () {
    loadDropdowns();

    // The Home Button Redirect (inside your success box)
    $w("#home").onClick(() => {
        wixLocation.to("/"); 
    });

    $w("#send").onClick(async () => {
        $w("#errorMsg").hide();
        
        if (validateForm()) {
            $w("#send").disable();
            $w("#send").label = "Calculating & Saving...";

            // 1. Format the Date String (YYYY-MM-DD)
            const pickerDate = $w("#dob").value;
            const dobStr = `${pickerDate.getFullYear()}-${String(pickerDate.getMonth() + 1).padStart(2, '0')}-${String(pickerDate.getDate()).padStart(2, '0')}`;

            // ==========================================
            // SMART COHORT LOOKUP
            // ==========================================
            let autoAgeGroupId = "";
            let autoAgeGroupLabel = "N/A";

            try {
                // Pull all active age groups to check manually
                const ageMapResult = await wixData.query("AgeGroup").limit(50).find();
                let matchedCohort = null;

                // Loop through and let JavaScript do the date math (much more reliable)
                for (let item of ageMapResult.items) {
                    if (item.dobStart && item.dobEnd) {
                        const start = new Date(item.dobStart);
                        const end = new Date(item.dobEnd);
                        
                        // Check if pickerDate falls exactly on or between start and end
                        if (pickerDate >= start && pickerDate <= end) {
                            matchedCohort = item;
                            break; // Match found, stop looping!
                        }
                    }
                }

                if (matchedCohort) {
                    autoAgeGroupId = matchedCohort._id; 
                    autoAgeGroupLabel = matchedCohort.AG_ageGroup || "Unknown"; 
                } else {
                    showError("Date of Birth falls outside of active club age groups.");
                    $w("#send").enable();
                    $w("#send").label = "Try Again";
                    return; // Stop the submission!
                }
            } catch (lookupErr) {
                console.error("Age Lookup Failed:", lookupErr);
                showError("System error calculating age group.");
                $w("#send").enable();
                $w("#send").label = "Try Again";
                return;
            }

            // 2. Extract the readable text labels for the dropdowns
            const expLabel = $w("#previous").options.find(o => o.value === $w("#previous").value)?.label || "";
            const posLabel = $w("#position").value ? ($w("#position").options.find(o => o.value === $w("#position").value)?.label || "") : "";

            // 3. Map Data to your exact SignolPlayers CMS Field Keys
            const playerData = {
                "SP_firstName": $w("#childfirst").value,
                "SP_lastName": $w("#childlast").value,
                "SP_dob": dobStr,
                "ageGroup": autoAgeGroupId, 
                "footballExperience": expLabel, 
                "position": posLabel,           
                "parentEmail": $w("#parentemail").value.trim().toLowerCase(),
                "parentPhone": $w("#parentmob").value, 
                "parentsName": $w("#parentname").value, 
                "SP_relationship": $w("#relation").value,
                // 1 - Enquiry Status
                "SP_status": "e4c79abb-e591-44c3-98a9-e111f276bdd2" 
            };

            // 4. Keep the original Twilio Payload exactly as it was
            const originalTwilioData = {
                "firstName": $w("#childfirst").value,
                "lastName": $w("#childlast").value,
                "dob": dobStr,
                "ageGroup": autoAgeGroupId, 
                "footballExperience": $w("#previous").value,
                "position": $w("#position").value,
                "parentsFullName": $w("#parentname").value,
                "parentEmail": $w("#parentemail").value,
                "parentPhone": $w("#parentmob").value,
                "relationship": $w("#relation").value
            };

            try {
                // A. Save directly to the Master Record
                await wixData.insert("SignolPlayers", playerData);

                // B. Grab the Labels for the SMS using the original data structure
                const smsDetails = {
                    ...originalTwilioData,
                    ageLabel: autoAgeGroupLabel, 
                    expLabel: expLabel,
                    posLabel: posLabel,
                    relLabel: $w("#relation").options.find(o => o.value === $w("#relation").value)?.label || "N/A"
                };

                // C. Trigger the Backend SMS exactly as originally mapped
                await notifyManagers(originalTwilioData.ageGroup, smsDetails); 

                // D. The UX Swap: Hide the form, show the success message
                $w("#playerenquiry").collapse();
                $w("#successBox").expand();
                $w("#successBox").show("fade");

            } catch (err) {
                console.error("Submission Error:", err);
                showError("Error saving. Please try again.");
                $w("#send").enable();
                $w("#send").label = "Try Again";
            }
        }
    });
});

function validateForm() {
    const required = [
        { id: "#childfirst", name: "First Name" },
        { id: "#childlast", name: "Last Name" },
        { id: "#dob", name: "Date of Birth" },
        { id: "#previous", name: "Experience" },
        { id: "#parentname", name: "Parent Name" },
        { id: "#parentemail", name: "Email" },
        { id: "#parentmob", name: "Mobile" },
        { id: "#relation", name: "Relationship" }
    ];

    for (let field of required) {
        if (!$w(field.id).value) {
            showError(`${field.name} is required.`);
            return false;
        }
    }

    const mob = $w("#parentmob").value;
    if (mob.length !== 11 || !mob.startsWith("0")) {
        showError("Mobile must be 11 digits starting with 0.");
        return false;
    }

    return true;
}

function showError(msg) {
    $w("#errorMsg").text = msg;
    $w("#errorMsg").show();
}

async function loadDropdowns() {
    try {
        // 1. Fetch and Map the Dropdowns
        const dictResults = await wixData.query("ClubDictionary").ascending("order").find();
        const allDict = dictResults.items;
        
        $w("#previous").options = allDict.filter(i => i.category === "football_experience").map(i => ({ label: i.label, value: i._id }));
        $w("#position").options = allDict.filter(i => i.category === "position").map(i => ({ label: i.label, value: i._id }));
        $w("#relation").options = allDict.filter(i => i.category === "relationship").map(i => ({ label: i.label, value: i._id }));
// ==========================================
        // 2. LOCK THE DATE PICKER BOUNDARIES
        // ==========================================
        const ageResults = await wixData.query("AgeGroup").limit(50).find();
        
        if (ageResults.items.length > 0) {
            // Initialize variables with the first row's dates
            let oldestAllowedDate = new Date(ageResults.items[0].dobStart);
            let youngestAllowedDate = new Date(ageResults.items[0].dobEnd);

            // Loop through all rows to find the absolute extremes
            ageResults.items.forEach(item => {
                // Find the oldest start date (Minimum Calendar Limit)
                if (item.dobStart) {
                    const rowStartDate = new Date(item.dobStart);
                    if (rowStartDate < oldestAllowedDate) {
                        oldestAllowedDate = rowStartDate;
                    }
                }
                
                // Find the youngest/latest end date (Maximum Calendar Limit)
                if (item.dobEnd) {
                    const rowEndDate = new Date(item.dobEnd);
                    if (rowEndDate > youngestAllowedDate) {
                        youngestAllowedDate = rowEndDate; 
                    }
                }
            });

            // Physically restrict the Wix DatePicker UI using only your database!
            $w("#dob").minDate = oldestAllowedDate;
            $w("#dob").maxDate = youngestAllowedDate; 
        }

    } catch (err) {
        console.error("Dropdown or Date bounds load failed", err);
    }
}