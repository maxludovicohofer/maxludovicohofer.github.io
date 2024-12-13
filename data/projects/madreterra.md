---
title: Madreterra
description: Online match-based sci-fi third person shooter, based on gravitational boots and bullets that generate terrain.
category: Prototype
developmentTime: P2W
tech:
- Unreal Engine
- Illustrator
- Photoshop
youTubeID: BRUzX8aHcfs
youTubeAspectRatio: 16/10
publishingDate: 2024-05-12
---

This prototype was made to evolve my multiplayer and art skills. It is a solo project focused on making the coolest game I possibly can.

The concept is to make an e-sports grade third person shooter, with fast paced 4-player free-for-all matches that take place on planets. When bullets hit the ground, they create structures that the player can then walk on, by switching his gravity. Before the game, players can select 3 skills. During the game, every 2 minutes one skill will be randomly selected and applied to the player.

Given the depth of the mechanics, I still created a full-fledged GDD for myself. Also, I made some gameplay flow and game theory graphs, to avoid stalemates and exploits. Since I’m also committed to the artistic side, I made some concept art to gain a better understanding of the visual identity and elements I want the game to have.

## Notable contributions

* Since Unreal Engine does not support switching gravity, I had to create some custom code to allow for smooth gravity transitions. This code eventually evolved in a deeper mechanic that works by selecting the surface you want to stand on, and the game figuring out the trajectory and necessary gravity to achieve the desired outcome position.
* I used this game as an opportunity to refactor my codebase into auto-consistent drag and drop components, to drastically improve development speed on future prototypes and games.
