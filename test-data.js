import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, set } from 'firebase/database';
import { getAuth } from 'firebase/auth';

// Firebase config (same as your project)
const firebaseConfig = {
  apiKey: "AIzaSyCPiWJT4GNlU1fTWWUhlpBoWLGU43zuZ-Q",
  authDomain: "hockey-1e16e.firebaseapp.com",
  projectId: "hockey-1e16e",
  databaseURL: "https://hockey-1e16e-default-rtdb.asia-southeast1.firebasedatabase.app",
  storageBucket: "hockey-1e16e.firebasestorage.app",
  messagingSenderId: "136690624613",
  appId: "1:136690624613:web:619f237b82367a0dbb3e8c"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

async function createTestMatch() {
  try {
    // Wait for current user to be available
    const user = await new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        unsubscribe();
        resolve(user);
      });
    });

    if (!user) {
      console.error('No user logged in. Please log in first.');
      process.exit(1);
    }

    console.log(`Creating test match for user: ${user.uid}`);

    // Sample team data
    const teamAPlayers = [
      { name: 'John Smith', role: 'Goalkeeper', isScorer: false },
      { name: 'Alex Johnson', role: 'Defender', isScorer: false },
      { name: 'Mike Davis', role: 'Defender', isScorer: false },
      { name: 'Chris Wilson', role: 'Midfielder', isScorer: false },
      { name: 'Tom Brown', role: 'Midfielder', isScorer: true },
      { name: 'Sam Lee', role: 'Forward', isScorer: true },
      { name: 'Ryan White', role: 'Forward', isScorer: false },
      { name: 'David Miller', role: 'Midfielder', isScorer: false },
      { name: 'James Taylor', role: 'Defender', isScorer: false },
      { name: 'Peter Anderson', role: 'Forward', isScorer: true },
      { name: 'Mark Thomas', role: 'Midfielder', isScorer: false },
    ];

    const teamBPlayers = [
      { name: 'Oliver Martin', role: 'Goalkeeper', isScorer: false },
      { name: 'Lucas Garcia', role: 'Defender', isScorer: false },
      { name: 'Ethan Martinez', role: 'Defender', isScorer: false },
      { name: 'Mason Rodriguez', role: 'Midfielder', isScorer: false },
      { name: 'Logan Harris', role: 'Midfielder', isScorer: true },
      { name: 'Aiden Clark', role: 'Forward', isScorer: true },
      { name: 'Jackson Lewis', role: 'Forward', isScorer: false },
      { name: 'Sebastian Young', role: 'Midfielder', isScorer: false },
      { name: 'Benjamin Hall', role: 'Defender', isScorer: false },
      { name: 'Lucas Allen', role: 'Forward', isScorer: true },
      { name: 'Henry King', role: 'Midfielder', isScorer: false },
    ];

    const matchData = {
      teamA: {
        name: 'Lions',
        players: teamAPlayers,
        score: 1,
        logoUrl: 'https://images.unsplash.com/photo-1633356714885-5bb3e700c4ae?auto=format&fit=crop&q=80&w=200'
      },
      teamB: {
        name: 'Ranchi Royals',
        players: teamBPlayers,
        score: 0,
        logoUrl: 'https://images.unsplash.com/photo-1515523110800-9415d13b84a8?auto=format&fit=crop&q=80&w=200'
      },
      status: 'live',
      time: '34:56',
      events: [
        {
          type: 'goal',
          team: 'A',
          playerName: 'Sam Lee',
          minute: '12',
          timestamp: Date.now() - 20000
        }
      ],
      schedule: {
        tournament: 'CUSTOM TOURNAMENT',
        venue: 'NEHRU STADIUM',
        matchDate: '2026-03-30',
        matchTime: '12:17'
      },
      createdAt: Date.now(),
      createdBy: user.uid
    };

    // Create the match
    const matchRef = push(ref(db, 'matches'), matchData);
    console.log(`✅ Test match created successfully!`);
    console.log(`Match ID: ${matchRef.key}`);
    console.log(`Created for user: ${user.uid}`);
    console.log('\nYou can now view it at: http://localhost:5173/matches');

    process.exit(0);
  } catch (error) {
    console.error('Error creating test match:', error);
    process.exit(1);
  }
}

// Run the function
createTestMatch();
