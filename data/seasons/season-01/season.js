/* =========================================================================
   SEASON 1  —  you edit this file
   =========================================================================
   Season 1 is the only season where you type both tier lists by hand.
   Every season after this builds its rosters automatically.

   Put 8 player ids in premium (or whatever premiumSize is set to in
   config.js) and everyone else in second.

   status   "ongoing" while matches are being played.
            Change to "completed" once every result is entered — that is
            what triggers promotion and relegation.
   ========================================================================= */

export default {
  number: 1,
  status: "ongoing",

  rosters: {
    premium: ["arnish","sabid","sun","robi","shifadul","rifat","rimon","nahid","aliul","shuvo"],
    second:  ["sijad","jaheen","seam","jihad","abdulla","arittro","mrinmoy","walid","abid","piyal","mahir"]
  },

  tiebreakOrder: { robi: 1, rimon: 2, arnish: 3, shuvo: 4 }

  
  /* Optional, almost never needed. Only used when two players finish level
     on points, goal difference, wins, draws, goals scored AND head-to-head.
     Lower number ranks higher.

     tiebreakOrder: { hasan: 1, imran: 2 }
  */
};
