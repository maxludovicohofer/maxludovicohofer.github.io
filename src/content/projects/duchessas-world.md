---
title: Duchessa's World
description: Mobile sidescroller, where the platforming is achieved by swapping between the "cat world" and the "human world".
category: Prototype
developmentTime: P5D
team: 5
roles:
    - Game designer
    - Team lead
    - Programmer
    - Sound artist
    - Technical artist
tech:
    - Unreal Engine
    - Maya
    - Illustrator
    - Photoshop
    - FL Studio
---

This prototype was commissioned by a company, requesting a mobile platformer-like game, featuring an odd-eyed cat character. Also, particular emphasis was placed on the technical aspects of the game and making the character’s unique features shine.

Inspired by Titanfall’s infamous time travel mechanic, we came up with a puzzle sidescroller, where the player can change the character’s “eyesight” to switch from normal world to a fantasy cat world. In each world, some level elements will be hidden, while others will be active, allowing for a smooth and fast puzzle gameplay. Also, levels are composed dynamically based on an estimated skill level, increasing or decreasing the difficulties of the puzzles. Also, for the prototype we kept graphic fidelity to a minimum to maximize compatibility with older devices.

Given the simple design and limited time, instead of a GDD I drew all level elements and their expected behavior on a blackboard for the team to see. This merged the brainstorming and design phases, helping with time.

## Notable contributions

* Since the game’s levels had to be procedurally generated, I came up with a dynamic difficulty algorithm that created a skill profile for the user. Given a constraint of 30 seconds to complete a level, this algorithm sequentially placed puzzle patterns based on their declared difficulty and the skill profile of the player.