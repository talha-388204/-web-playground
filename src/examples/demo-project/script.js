// This file contains JavaScript for the example project.

document.addEventListener('DOMContentLoaded', () => {
    const output = document.getElementById('output');
    const inputField = document.getElementById('inputField');
    const submitButton = document.getElementById('submitButton');

    submitButton.addEventListener('click', () => {
        const userInput = inputField.value;
        if (userInput) {
            const newElement = document.createElement('p');
            newElement.textContent = `You entered: ${userInput}`;
            output.appendChild(newElement);
            inputField.value = ''; // Clear input field
        }
    });
});