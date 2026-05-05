import { query } from "./db.mjs";

async function checkImages() {
  try {
    console.log("--- Learning Questions ---");
    const { rows: learning } = await query("SELECT image_url FROM learning_questions LIMIT 5");
    console.log(learning);

    console.log("--- Pictogram Questions ---");
    const { rows: pictogram } = await query("SELECT image_url FROM pictogram_questions LIMIT 5");
    console.log(pictogram);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkImages();
