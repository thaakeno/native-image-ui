# Gemini Native Image UI

This web application provides a user-friendly interface for interacting with the Gemini 2.0 AI model. It allows you to send text prompts and images to the AI and receive text and image responses. The interface is designed to be intuitive and customizable, with features like theme switching (light and dark theme), debug mode (for testing and troubleshooting), and settings for API key, temperature, and max output tokens.

![image](https://github.com/user-attachments/assets/c486443c-d107-4b11-99f7-8fa412960151)

## Key Features

# **AI-Powered Chat:** Interact with the Gemini 2.0 AI model for generating text and images.
![image](https://github.com/user-attachments/assets/893c0423-fc3b-4901-9537-82a01fbcaa9e)

# **Multi-modal Input:** Send both text and images as input to the AI.
![image](https://github.com/user-attachments/assets/ac27a06c-b616-4beb-b062-30b544ef5e56)

- **Rich Output:** Receive responses in text format with Markdown rendering and syntax highlighting, as well as AI-generated images.
# **Persistent Chat History**
![image](https://github.com/user-attachments/assets/7a1f4541-d7a9-4d41-9f41-e2b4f9c24a15)

# **Customizable Settings:**
![image](https://github.com/user-attachments/assets/cdb77910-2edf-4597-a088-8b3487caa6ca)

- **API Key:** Securely store and manage your Gemini API key.
- **Temperature:** Control the creativity and randomness of AI responses.
- **Max Output Tokens:** Limit the length of AI-generated text responses.
- **Theme Switching:** Toggle between dark and light themes for comfortable viewing.
- **Debug Mode:** Enable a debug panel to view detailed logs and troubleshoot issues.

# **Image Support:**
![image](https://github.com/user-attachments/assets/5a651cb6-c8ba-4342-a3af-e5609778dac2)


- **Markdown Rendering:** AI responses are rendered in Markdown for rich text formatting.
- **Edit User Messages:** Edit and resend user messages to refine prompts and regenerate AI responses.
- **Clear Chat:** Clear the current chat conversation and start fresh.
- **Debug Console:** (Debug Mode) View detailed logs of API requests, responses, and application events for troubleshooting.
- **Responsive Design:** User interface adapts to different screen sizes for optimal viewing on various devices.

## Getting Started

### Prerequisites

- Docker installed on your system. You can download Docker Desktop from [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/).

### Running with Docker

1.  **Build the Docker image:**

    Navigate to the `native-image` directory in your terminal and run the following command to build the Docker image:

    ```bash
    docker build -t native-image-app .
    ```

2.  **Run the Docker container:**

    Once the image is built, you can run a container in detached mode (in the background):

    ```bash
    docker run -d -p 8080:80 native-image-app
    ```

    Alternatively, you can run the container in non-detached mode to see the logs directly in your terminal:

    ```bash
    docker run -p 8080:80 native-image-app
    ```

3.  **Access the application:**

    Open your web browser and go to `http://localhost:8080` to access the AI Chat Interface.

### Running with Docker Compose

**Important:** Before running Docker Compose commands, make sure you navigate to the `native-image` directory in your terminal. This directory contains the `docker-compose.yml` file, which is required for Docker Compose to configure and run the application.

1.  **Navigate to the `native-image` directory:**

    Ensure you are in the `native-image` directory where the `docker-compose.yml` file is located.

2.  **Run Docker Compose Up:**

    Run the following command to build and start the application using Docker Compose. This command will both build the Docker image and start the container:

    ```bash
    docker-compose up --build
    ```

    This command will:
    - Build the Docker image if it doesn't exist or if there are changes to the Dockerfile.
    - Create and start a container based on the built image.
    - Set up any networks and volumes defined in your `docker-compose.yml` file.
    - Display logs from the running container in your terminal.

3.  **Access the application:**

    Once the application is running, open your web browser and go to `http://localhost:8080` to access the AI Chat Interface.

## Usage

1.  **Set your Gemini API key:**
    - Click on the "Settings" button in the header.
    - Enter your Gemini API key in the input field.
    - Click "Save API Key". You can get your API key for free from [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
2.  **Start chatting:**
    - Type your message in the input field at the bottom.
    - You can also upload images using the upload button or paste images from your clipboard.
    - Press "Send" or hit Enter to send your message to the AI.
3.  **Explore settings:**
    - Adjust the temperature and max output tokens in the settings to customize the AI's responses.
    - Enable debug mode to view detailed logs for troubleshooting.
    - Switch between light and dark themes using the theme toggle button.
4.  **View chat history:**
    - Click the history button to view and manage your chat history.
5.  **Create new chat:**
    - Click the "+" button to start a new conversation.

## Contributing

[Contributions are welcome! Please feel free to submit pull requests or open issues for any bugs or feature requests.]


Version 1.0.2

## License

[MIT License - feel free to use and modify this project.]
