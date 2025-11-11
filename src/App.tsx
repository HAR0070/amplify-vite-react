// src/App.tsx

import { useState } from 'react';
import './App.css';

// Get the URL from the environment variable
const LAMBDA_URL = import.meta.env.VITE_API_URL;

function App() {
  // State for the item you are typing in the input box
  const [newItem, setNewItem] = useState('');

  // State for the list of items 
  const [items, setItems] = useState<string[]>([]);

  // State for the message from the Lambda
  const [responseMessage, setResponseMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); // Stop the form from reloading the page
    setResponseMessage('Sending...');

    try {
      const response = await fetch(LAMBDA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Send the item from our 'newItem' state
        body: JSON.stringify({
          todo_item: newItem,
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setResponseMessage(`Success: ${JSON.stringify(data)}`);

      // Optionally, add the new item to our list and clear the input
      setItems([...items, newItem]);
      setNewItem('');

    } catch (error) {
      console.error('Error sending data:', error);
      setResponseMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <main>
      <h1>My Todo App</h1>

      {/* This form now works correctly */}
      <form onSubmit={handleSubmit}>
        <label>
          Enter item:
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
          />
        </label>
        <button type="submit">Send to Lambda</button>
      </form>

      {/* Display the response from the Lambda */}
      {responseMessage && <p>{responseMessage}</p>}

      {/* This list will now show items you add */}
      <h3>My List</h3>
      <ul>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </main>
  );
}

export default App;
