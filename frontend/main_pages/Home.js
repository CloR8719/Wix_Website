import wixData from 'wix-data';

$w.onReady(function () {
  // Calculate Monday of this week
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);

  // Format as "YYYY-MM-DD"
  const yyyy = monday.getFullYear();
  const mm = String(monday.getMonth() + 1).padStart(2, '0');
  const dd = String(monday.getDate()).padStart(2, '0');
  const weekCommencingStr = `${yyyy}-${mm}-${dd}`;

  // Filter dataset by week_commencing (use internal key!)
  $w("#dataset1").setFilter(
    wixData.filter()
      .eq("week_commencing", weekCommencingStr)
  );

  // After dataset is ready, adjust table visible rows
  $w("#dataset1").onReady(() => {
    $w("#dataset1").getItems(0, 100).then(result => {
      const rowCount = result.items.length;

      // Minimum rows to display (so table isn't too small)
      const minRows = 2;
      const displayRows = Math.max(rowCount, minRows);

      // Set the number of visible rows in the table
      $w("#table1").rows = displayRows;

      // Debug: print what the filter returned
      console.log("Filtered items:", result.items);
    });
  });
});
