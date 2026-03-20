# App Deployment

In this module, we'll develop an application hosted on AWS using an AI agent. It will integrate:
- Our HuggingFace model server (from Module 1)
- Our LLM API key for additional AI capabilities

You'll build and deploy a real application using your own cloud infrastructure. To rail this, we will use PyRun.

## Prerequisites

### AWS Account

You need an AWS account with access. This can be:
- A personal AWS account
- **AWS Academy account** (valid for this tutorial)

It's recommended to have your AWS Console open in a browser tab during the tutorial.

### PyRun Account

PyRun eases Python execution on your AWS infrastructure. Create your account here:

https://docs.pyrun.cloud/overview/account-setup

Follow the setup guide to:
1. Sign up for PyRun
2. Connect your AWS account via CloudFormation

> **Tip:** Have your AWS Console open before starting the PyRun setup, especially if you use SSO or IAM Identity Center.

### OpenCode

[OpenCode](https://opencode.ai/) is an open-source AI coding agent that runs in your terminal, IDE, or desktop. We'll use it to build the application through natural language prompts.

**Key features:**
- **Free models included** - No additional subscriptions required to get started
- **Connect your own providers** - Use GitHub Copilot, ChatGPT Plus/Pro, Claude, or 75+ other LLM providers
- **LSP enabled** - Automatically loads language servers for better code understanding
- **Multi-session** - Run multiple agents in parallel

#### GitHub Copilot for Students

If you have a GitHub Education account, you can get GitHub Copilot for free. Activate it at:

https://github.com/settings/education/benefits

See [GitHub's documentation](https://docs.github.com/en/copilot/how-tos/manage-your-account/free-access-with-copilot-student) for details on student eligibility.

#### VSCode Keybinding Conflicts

When running OpenCode in VSCode's integrated terminal, VSCode intercepts keys before OpenCode sees them. Add this to your VSCode `settings.json` to forward keybindings to the shell:

```json
"terminal.integrated.sendKeybindingsToShell": true
```

This sends all keyboard events directly to the terminal when focused. Note: VSCode shortcuts like `Ctrl+C` won't work while the terminal is focused — use workspace-scoped settings if needed.

## Setup

### Step 0: Configure PyRun Runtime

Before writing code, configure the PyRun runtime to include SSH (needed for EC2 deployment). Just edit the `.pyrun/Dockerfile` in your workspace to install ssh through apt.

PyRun will detect this file and prompt you to rebuild the runtime. See [PyRun Runtime Management](https://docs.pyrun.cloud/features/runtime-management) for details.

### Step 1: Configure Environment Variables

In PyRun's integrated VSCode, copy `.env.template` to `.env`:

```bash
cp .env.template .env
```

Then edit `.env` and fill in your values:

```
HF_APP_ENDPOINT=https://your-username-your-space.hf.space
GOOGLE_API_KEY=your-api-key-here
```

**Variables:**

| Variable | Source | Description |
|----------|--------|-------------|
| `HF_APP_ENDPOINT` | Module 1 | Your HuggingFace Space endpoint URL (format: `https://username-space-name.hf.space`) |
| `GOOGLE_API_KEY` | Module 2 | Your Google AI Studio API key |

> **Note:** For local testing before deployment, you can use OpenCode's free models (e.g., MiniMax M2.5) — no API key required. See [OpenCode Zen](https://opencode.ai/zen) for available free models.

## Building the Application

### OpenCode Prompt

Use this prompt in OpenCode to build an example application:

```
Build a Flask web application with the following features:

1. A web interface with two buttons and a text input field
2. Button 1 "Generate": Calls Gemini API (using GOOGLE_API_KEY from .env) to generate an LLM comment based on user input, displays the generated text
3. Button 2 "Analyze": Calls my HuggingFace Space endpoint (HF_APP_ENDPOINT from .env) to classify sentiment of the displayed text, shows the sentiment result
4. The app should load environment variables from a .env file (structure matches .env.template - do not read .env)
5. Include requirements.txt

First, create the application and test it locally to verify it works. Then help me deploy it to a new AWS EC2 instance (don't use existing ones) with a public URL.
Use openssh-client to connect to the EC2 instance.

The HF endpoint expects POST requests with JSON body {"inputs": "text to classify"} and returns sentiment labels.
The Gemini API should use the generateContent endpoint for text generation.
Before anything, create a new SSH key pair and add it to your AWS account. Use this key pair to connect to the EC2 instance via openssh-client.
```

### Expected Architecture

```
User Browser
    │
    ▼
Flask App (EC2)
    │
    ├──► Gemini API (Google) ──── LLM-generated text
    │
    └──► HF Space Endpoint ────── Sentiment classification
```

### App Iteration

Once your application is running, iterate on it with this prompt:

```
Update the Flask application to:

1. Save each analyzed comment to AWS S3 (create a new bucket if needed). Store as JSON with timestamp, original text, generated comment, and sentiment.
2. Add a "History" button that retrieves and displays the last 10 comments from S3.
3. Use boto3 for S3 operations. Use the developer's AWS credentials.

Test locally if possible, then redeploy to the EC2 instance.
```

This adds persistence and history functionality to your application.
