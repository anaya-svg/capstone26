# SnapFun Studio ERP - Login & Register Pages

This project contains the Login and Register pages for SnapFun Studio ERP, built with React, Vite, and Tailwind CSS.

## Project Structure

```
capstone/
├── src/
│   ├── pages/
│   │   ├── Login.jsx      # Login page component
│   │   └── Register.jsx   # Register page component
│   ├── App.jsx             # Main app with routing
│   ├── main.jsx            # Entry point
│   └── index.css           # Global styles with Tailwind
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## Setup Instructions

Due to PowerShell execution policy restrictions, you'll need to install dependencies manually. Here are the steps:

### Option 1: Enable PowerShell Script Execution (Recommended)
1. Open PowerShell as Administrator
2. Run: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`
3. Then run: `npm install`
4. Start the dev server : `npm run dev`

### Option 2: Use Command Prompt (cmd)
1. Open Command Prompt (not PowerShell)
2. Navigate to the project directory: `cd "c:\Users\ASUS\Documents\CAPSTONE PROJECT\capstone"`
3. Run: `npm install`
4. Start the dev server: `npm run dev`

### Option 3: Use Node.js Command Prompt
1. Search for "Node.js Command Prompt" in Start menu
2. Navigate to the project directory
3. Run: `npm install`
4. Start the dev server: `npm run dev`

## Features Implemented

### Login Page (`/login`)
- SnapFunERP logo with purple icon
- "Welcome Back" heading with subtitle
- Email input field
- Password input field
- Black "Sign In" button with arrow icon
- Link to Register page ("Don't have an account? Register here")

### Register Page (`/register`)
- SnapFunERP logo with purple icon
- "Create Account" heading with subtitle
- Full Name input field
- Email input field
- Password input field
- Confirm Password input field
- Purple "Create Account" button with user icon
- Link to Login page ("Already have an account? Sign in here")

## Design Details

- **Background**: Light blue to purple gradient
- **Card**: White with rounded corners and shadow
- **Primary Color**: Purple (#7c3aed, #6d28d9)
- **Typography**: System fonts with proper hierarchy
- **Responsive**: Works on all screen sizes
- **Icons**: SVG icons for logo, buttons, and navigation

## Next Steps

After getting the app running, we can implement:
1. Form validation
2. API integration for authentication
3. Email verification system (as mentioned in requirements)
4. Error handling and user feedback
5. Protected routes for authenticated users

## Dependencies

- React 18.3.1
- React DOM 18.3.1
- React Router DOM 6.22.3
- Tailwind CSS 3.4.3
- Vite 5.2.11
