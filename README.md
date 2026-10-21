# Ahmed Workout Plan — Personalized Arabic AI Coach v6

Android workout tracker with Arabic personal setup, customized 4-week exercise plans, food-preference-based meal examples, and experimental on-device pose detection.

## On first launch
1. Select a physique/training goal: lose fat, body recomposition, muscle gain, maintenance, or strength.
2. Enter adult age, height, weight and optional manually transcribed InBody body-fat %, skeletal muscle mass and BMR. Enter/update the scan date.
3. Select preferred protein, fats, carbohydrate, vegetable, and fruit ingredients.
4. Select 2–6 available training days, experience, and split: automatic, regular full-body, upper/lower, push/pull/legs, or Arnold (6 days, advanced).
5. Review estimated calories, protein and planned sessions, then create your plan.

Arabic voice prompts play through installed Arabic text-to-speech engines, and can be muted.

## Personalized plan logic
- The app reuses the existing 96-exercise catalog to build 4 weeks of sessions aligned to chosen weekly days.
- Training-day and rest-day calories differ slightly. Energy is an *estimate* using user-entered InBody BMR or an adult Mifflin-St Jeor resting metabolic rate estimate, activity multiplier and modest goal adjustment. Meals are only examples built from preferred ingredients; exact food macros/portions are **not** calculated from a nutrient database.
- InBody values are manually entered, not extracted from reports or imported images/PDFs.
- Settings and scan history are stored locally and included when the user exports a JSON backup. There is no cloud login or upload for InBody data.
- Review nutrition and training targets with a qualified professional when clinically indicated.

## Exercise demonstrations
This version replaces the automatically generated 96 diagram animations with **online exercise-specific search links to real instruction videos** (YouTube search for the exercise, emphasizing Muscle & Strength), launched in the device browser/app. These are links to search results, not 96 locally bundled, pre-vetted video clips. Internet access is needed; user chooses an appropriate demonstration from the results.

## AI Form Coach
Selected movement families use on-device Google ML Kit pose landmarks, approximate 2D joint angles, and experimental rep counts. Unverified movements clearly show camera preview only. Arabic TTS works when a compatible voice is available.

No single mobile camera or basic joint-angle rule can validate safe lifting form. Coach feedback must not replace qualified coaching, especially for heavy or complex movements.

## Upgrading
Export a JSON backup from **Progress → Data backup** before installing a new debug APK. GitHub Actions debug signing keys may differ between runs, so an existing installation might not update in place. Import your JSON backup after reinstalling.

## Evidence informing the estimates
- NIDDK adult Body Weight Planner: https://www.niddk.nih.gov/health-information/weight-management/body-weight-planner
- ACSM physical activity guidelines: https://acsm.org/education-resources/trending-topics-resources/physical-activity-guidelines/
- ISSN protein and exercise (2017): https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/
- Mifflin-St Jeor validity systematic review: https://doi.org/bdr2qs
