# KeySuite Alpha V0.1

GitHub Pages-ready working demo for Keylargo.

## Features
- Working local login
- Add/edit/delete users
- Add/edit/delete customers
- Add/edit/delete products
- Excel price import with preview and confirmation
- Existing model prices are updated; unknown models are added
- Browser local storage persistence

## Demo login
- Email: `ray@keylargo.com`
- Password: `admin123`

## Publish on GitHub Pages
1. Create a new public or private GitHub repository.
2. Upload every file in this folder to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select `main` and `/root`, then save.

## Important alpha limitation
This version is a front-end demo. Data is stored only in the current browser using `localStorage`. It is suitable for testing the workflow, but not yet for multi-user production use. Supabase authentication and cloud database will be connected in the next build.

## Excel import columns
Required:
- Model
- Price

Optional:
- Description
- Cost
- HP
- kW
- Brand
- Series
- Category
