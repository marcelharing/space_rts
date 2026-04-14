      ███████╗██████╗  █████╗  ██████╗███████╗
      ██╔════╝██╔══██╗██╔══██╗██╔════╝██╔════╝
      ███████╗██████╔╝███████║██║     █████╗  
      ╚════██║██╔═══╝ ██╔══██║██║     ██╔══╝  
      ███████║██║     ██║  ██║╚██████╗███████╗
      ╚══════╝╚═╝     ╚═╝  ╚═╝ ╚═════╝╚══════╝
      
      ██████╗ ████████╗███████╗
      ██╔══██╗╚══██╔══╝██╔════╝
      ██████╔╝   ██║   ███████╗
      ██╔══██╗   ██║   ╚════██║
      ██║  ██║   ██║   ███████║
      ╚═╝  ╚═╝   ╚═╝   ╚══════╝


**Space RTS is a browser-based 2D real-time strategy game built with JavaScript and HTML5 Canvas for rendering. 
The project uses Vite as a modern build tool and bundler, with custom game logic implemented in vanilla JavaScript. 
Player progression is persisted across sessions using localStorage, and unit tests ensure core mechanics are reliable. 
The game features three levels with increasing difficulty, persistent upgrades, and responsive AI opponents.**


**Made with help of LLMs: GPT 5.4 mini and GLM-5.**


## How to Play

1. **Select Units**: Left-click or drag-box to select
2. **Move/Attack**: Right-click to move selected units
3. **Gather Resources**: Workers automatically mine nearest meteors
4. **Produce Units**: Build workers, melee, or ranged units from your base
5. **Destroy Enemy**: Eliminate the enemy base to win

##  Project Structure

```
space-rts/
├── src/              # Source code
│   ├── game.js       # Main game logic
│   ├── app.js        # Application initialization
│   ├── progression.js # Persistent upgrade system
│   └── style.css     # Game styling
├── test/             # Unit tests
├── start.html        # Level selection menu
├── level-1.html      # Level 1 entry
├── level-2.html      # Level 2 entry
├── level-3.html      # Level 3 entry
└── vite.config.js    # Build configuration
```

## Live Demo

**Live Demo**: [https://marcelharing.github.io/space_rts](https://marcelharing.github.io/space_rts)
