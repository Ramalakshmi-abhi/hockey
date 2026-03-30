// Test data generator for Firebase
export const SAMPLE_TEAM_A_PLAYERS = [
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

export const SAMPLE_TEAM_B_PLAYERS = [
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

export function generateTestMatchData(userId) {
  return {
    teamA: {
      name: 'Lions',
      players: SAMPLE_TEAM_A_PLAYERS,
      score: 1,
      logoUrl: 'https://images.unsplash.com/photo-1633356714885-5bb3e700c4ae?auto=format&fit=crop&q=80&w=200'
    },
    teamB: {
      name: 'Ranchi Royals',
      players: SAMPLE_TEAM_B_PLAYERS,
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
    createdBy: userId
  };
}
