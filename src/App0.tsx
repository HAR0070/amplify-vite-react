// src/App.tsx

import { useState } from 'react';
import './App.css';

// Get the URL from the environment variable
const LAMBDA_URL = "https://qijmbjbb26uh273zxckc5shfwi0hvtva.lambda-url.us-east-1.on.aws/";

// FIX: Define a type for our summoner data to make it safer
// This is optional but good practice in TypeScript
type SummonerData = {
  summoner: {
    name: string;
    level: number;
  };
  topChampions: Champion[];
};

type Champion = {
  championId: number;
  championLevel: number;
  championPoints: number;
};

function App() {

  const [summoner, setSummoner] = useState({
    riotId: '',
    region: 'na1', // Default region
  });

  // FIX: useState syntax corrected. Use `false` for a boolean.
  const [isLoading, setIsLoading] = useState(false);

  // FIX: useState syntax corrected. Use `null` for data that doesn't exist yet.
  const [data, setSummonerData] = useState<SummonerData | null>(null);

  // State for the message
  const [responseMessage, setResponseMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setResponseMessage(''); // Clear old messages
    setSummonerData(null);    // Clear old data

    if (!summoner.riotId) {
        // FIX: setResponseMessage only takes one argument
        setResponseMessage('Please enter a Riot ID');
        return;
    }

    if (!summoner.riotId.includes('#')) {
        // FIX: setResponseMessage only takes one argument
        setResponseMessage('Please use Riot ID format: GameName#TAG');
        return;
    }

    setResponseMessage('Sending...');
    setIsLoading(true);

    try {
        const response = await fetch(LAMBDA_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                summonerName: summoner.riotId,
                region: summoner.region
            })
        });

        const responseData = await response.json();

        if (response.ok) {
            setSummonerData(responseData); // Set the full data object
            setResponseMessage('Summoner found!');
        } else {
            setResponseMessage(responseData.error || 'Failed to fetch summoner data');
        }
    } catch (error) {
        console.error('Error:', error);
        print('Error:', error);
        setResponseMessage('Network error. Please try again.');
    }
    setIsLoading(false);

  // FIX: The handleSubmit function MUST be closed here, before the return.
  }

  // FIX: The component's return statement starts *after* handleSubmit ends.
  return (
    <main>
      <div id="lookup-screen" className="lookup-container">
        <div className="lookup-box">
          <div className="lookup-header">
            <div className="lookup-trophy-icon"></div>
            <h1>League of Legends Stats</h1>
            <p>Enter your summoner details to begin</p>
          </div>
          <form
            onSubmit={handleSubmit}
            id="lookup-form"
            className="lookup-form-container">
            <div className="form-group">
              <label htmlFor="summoner-name">Summoner Name</label>
              <input
                type="text"
                id="summoner-name"
                value={summoner.riotId}
                onChange={(e) =>
                  setSummoner({ ...summoner, riotId: e.target.value })
                }
                placeholder="Enter your summoner name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="region">Region</label>
              <select
                id="region"
                value={summoner.region}
                onChange={(e) =>
                  setSummoner({ ...summoner, region: e.target.value })
                }
              >
                <option value="na1">NA</option>
                <option value="euw1">EUW</option>
                <option value="eun1">EUNE</option>
                <option value="kr">KR</option>
                <option value="tr1">europe</option>
                <option value="jp1">asia</option>
                <option value="oc1">sea</option>
                <option value="ph2">sea</option>
              </select>
            </div>

            <button
              type="submit"
              id="lookup-submit-btn"
              disabled={isLoading}
              className="lookup-submit-btn"
            >
              <span>{isLoading ? 'Looking up...' : 'Find Summoner'}</span>
            </button>
          </form>

          {/* Display the response message */}
          {responseMessage && <p className="response-message">{responseMessage}</p>}

          {/* FIX: This is the React way to show data.
            Check if `data` AND `data.summoner` exist, then render the JSX.
          */}
          {data && data.summoner && (
            <div id="summoner-results" className="summoner-results">
              {/* FIX: Correct syntax, just text */}
              <h4>Summoner Info</h4>
              <div className="summoner-card">
                {/* FIX: Use {variable} to display data, not ${} */}
                <h5>{data.summoner.name}</h5>
                <p>Level: {data.summoner.level}</p>
              </div>

              {/* FIX: This is the React way to render a list.
                We check if the data exists, then .map() it to JSX.
              */}
              {data.topChampions && data.topChampions.length > 0 ? (
                <>
                  <h4>Top Champions</h4>
                  <div id="champion-mastery" className="champions-grid">
                    {data.topChampions.map((champ) => (
                      <div key={champ.championId} className="champion-card">
                        <p><strong>Champion ID:</strong> {champ.championId}</p>
                        <p><strong>Mastery Level:</strong> {champ.championLevel}</p>
                        <p><strong>Mastery Points:</strong> {champ.championPoints.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p>No champion mastery data found.</p>
              )}
            </div>
          )}

          <div className="lookup-footer">
            <p>Data provided by Riot Games API • Not affiliated with Riot Games</p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default App;

// FIX: Removed the extra "}" that was at the end of the file.
