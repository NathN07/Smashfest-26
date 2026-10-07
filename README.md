# 🏓 SMASHFEST '26 | Tournament Management Dashboard

<div align="center">
  <br />
    <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=900&size=40&pause=1000&color=10B981&center=true&vCenter=true&width=600&lines=SMASHFEST+'26;Table+Tennis+Tournament;Real-Time+Live+Scoring;VCT+Double+Elimination" alt="Typing SVG" />
  <br />

  **An advanced, real-time Table Tennis Tournament Management System featuring full VCT-style Double Elimination brackets, live point synchronization, and SuperAdmin controls. Built for PW Institute of Innovation.**

  <br />

  ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
  ![Vite](https://img.shields.io/badge/Vite-B73BA5?style=for-the-badge&logo=vite&logoColor=FFD62E)
  ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
  ![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=Firebase&logoColor=white)
</div>

---

## ✨ Key Features

*   ⚔️ **Dual Tournament Formats:** Fully automated cascading brackets for both **24-Player Singles** and **12-Team Doubles**.
*   🏆 **VCT Double-Elimination:** Authentic Valorant Champions Tour (VCT) bracket logic. Winners advance, losers drop to the Lower Bracket for a second chance.
*   ⚡ **Real-Time Live Scoring:** Point-by-point live match tracking synced instantly across all viewer devices using Firebase Firestore. 
*   🛡️ **Role-Based Access Control:** Secure Admin and SuperAdmin login gateways to prevent unauthorized tampering.
*   ✏️ **SuperAdmin Overrides:** Total manual control over the tournament flow. Edit player rosters, match dates, and manually advance/swap teams dynamically.
*   📊 **Automated Points Table:** Dynamic standings that calculate matches played, wins, losses, sets won/lost, and total points automatically.
*   📅 **Today's Schedule:** A smart dashboard feed that automatically highlights matches scheduled for the current day.
*   💾 **Fail-Safe Architecture:** Bulletproof local caching mixed with cloud synchronization ensures zero data loss even during connection drops.

---

## 🛠️ Tech Stack

*   **Frontend UI:** React (Functional Components, Hooks)
*   **Styling:** Tailwind CSS (Custom dark mode UI with emerald/red/purple glowing accents)
*   **Icons:** Lucide React
*   **Database & Sync:** Firebase Firestore (Real-time listeners & snapshot sync)
*   **Authentication:** Firebase Auth (Anonymous & Custom Token bridging)
*   **State Management:** React `useReducer` and Context API
