# Stalker Application Setup

Follow these steps to set up the Stalker application:

## 1. Create .env.local File

Create a file named `.env.local` in the root directory with the following content:

```
OPENAI_API_KEY=your_actual_openai_api_key_here
ASSISTANT_ID=your_actual_assistant_id_here
```

**IMPORTANT**: You MUST replace both values with your actual OpenAI API key and Assistant ID. The application will not work without proper API configuration.

## 2. Image Issues Fixed

We've fixed the image loading issues by:
- Creating a copy of the Stalker.png file as Stalker-fixed.png
- Updating the index.js file to use this new file
- Adding a favicon.ico file to prevent 404 errors

## 3. Running Tests

To confirm everything is working:

```
npm test
```

## 4. Running the App

After completing these steps, run the app with:

```
npm run dev
```

The app will be accessible at http://localhost:4000. Make sure you have configured your OpenAI API credentials properly. 