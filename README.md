# Recipes

Webpage for easy to make recipes

## Adding Recipes

- Add a new recipe as a Markdown file under the `recipes/` directory. Use the template recipe in `template.md` as a guide.
- Fill in the front matter at the top of the file (between the `---` lines):
  - `title`: display name
  - `image`: optional photo path relative to `recipes/`, e.g. `images/shrimp-gravy.jpg` (aim for ~1200px wide, under ~300KB)
  - `time`, `servings`: shown in the list and recipe header
- Put photos in `recipes/images/`. You can also add images inside a recipe with `![alt](images/step.jpg)`.
- Add your new recipe to `recipes/index.yml`.

## TODO

- Add long AI-generated stories for each recipe