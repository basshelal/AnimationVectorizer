import React from 'react';
import {from} from "./Utils";

export default function App() {
    return (
        <div className="App">
            <header className="App-header">
                <img src="" className="App-logo" alt="logo"/>
                <p>
                    Edit <code>src/App.tsx</code> and save to reload.
                </p>
                {from(0).to(100).map(i => `${i}, `)}
                <a
                    className="App-link"
                    href="https://reactjs.org"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Learn React
                </a>
            </header>
        </div>
    );
}