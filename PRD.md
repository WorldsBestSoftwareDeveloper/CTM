PRD — Catch the Magician
Project Overview

Build a production-quality mobile-first Web3 endless runner called Catch the Magician.

The game should be a polished browser-based PWA built using modern web technologies while showcasing MagicBlock Ephemeral Rollups on Solana.

The project is intended for the MagicBlock Solana Blitz v6 Hackathon.

The final result should feel like a premium mobile game similar in polish to Temple Run, Subway Surfers, Bull Rush, or Tomb Runner, but with a unique magical fantasy identity.

The game must be deployable as a PWA and playable on:

Desktop browsers
Android browsers
Solana Seeker browser
Installable as a PWA

It must integrate:

MagicBlock Ephemeral Rollups
Solana Wallet Adapter
Mobile Wallet Adapter
Session Keys
On-chain leaderboards
Persistent player profile
IMPORTANT

Do NOT immediately start implementing everything.

First produce:

Complete software architecture
Folder structure
Database/program architecture
Game architecture
Rendering architecture
Babylon scene architecture
State management plan
Blockchain architecture
Deployment architecture

Only after architecture approval should implementation begin.

Tech Stack

Use ONLY modern technologies.

Frontend

React 19
TypeScript
Vite

Rendering

Babylon.js

Game Engine

Babylon.js ECS style architecture

Styling

Tailwind CSS
Framer Motion

PWA

vite-plugin-pwa

Blockchain

Solana Wallet Adapter
Mobile Wallet Adapter
MagicBlock SDK
Ephemeral Rollups
Session Keys

Backend (if needed)

Node
Express
Supabase only where appropriate

Deployment

Vercel
Game Theme

Dark fantasy.

Purple magic.

Player is escaping from an ancient demon.

The demon is constantly chasing the player.

The world consists of floating magical ruins suspended in the sky.

Everything should feel mystical.

Art Direction

Style

Low-poly stylized.

NOT realistic.

Think:

Journey
Monument Valley
Sky
Temple Run

Color Palette

Primary

Purple

Secondary

Black

Accent

Magenta

Neon Violet

Deep Blue

Lighting

Bloom

Volumetric fog

God rays

Magic particles

Glowing runes

Gameplay

Third-person endless runner.

Camera behind player.

Three lanes.

Continuous forward movement.

Player can:

Move left

Move right

Jump

Slide

Collect items

Use powerups

Avoid obstacles

Player dies when caught by demon or colliding.

Controls

Desktop

Arrow Keys

A D

Space

Shift

Mobile

Swipe Left

Swipe Right

Swipe Up

Swipe Down

Touch buttons optional.

Camera

Third-person follow camera.

Smooth interpolation.

Dynamic FOV.

Camera shake.

Zoom during speed boosts.

Environment

Infinite procedural generation.

One biome for MVP.

Ancient Arcane Ruins.

Objects

Floating islands

Broken bridges

Ruined pillars

Purple crystals

Magic gates

Floating debris

Glowing runes

Fog

As level increases

Increase:

Fog

Particles

Lighting

Difficulty

Music intensity

Obstacles

Broken walls

Spikes

Magic barriers

Fire

Rolling rocks

Falling debris

Collapsed bridge sections

Collectibles

Magic Essence

Arcane Crystals

Rare Relics

Powerups

Shield

Speed Boost

Magnet

Slow Time

Portal Jump

Double Score

Player

Young magician.

White hair.

Purple robe.

Crystal staff.

Flowing cape.

Magic trail.

Animations

Idle

Run

Jump

Slide

Roll

Death

Victory

Demon

Large shadow demon.

Purple fire.

Red glowing eyes.

Smoke particles.

Chains.

Gets faster over time.

Visible in background.

Never disappears.

Difficulty System

Every level:

Increase

Movement speed

Spawn rate

Obstacle complexity

Demon speed

Fog

Lighting

Particle count

Music layers

HUD

Distance

Score

Magic Essence

Combo

Multiplier

Current Level

Powerups

Demon Proximity Bar

Pause Button

FPS (debug)

Home Screen

Animated background.

Logo.

Connect Wallet.

Play.

Leaderboard.

Profile.

Settings.

Profile

Wallet

Avatar

Highest Score

Highest Distance

Runs Played

Magic Essence

Achievements

Rank

Leaderboards

Global

Daily

Weekly

Future:

Friends

Clan

All stored on-chain.

Wallet

Desktop

Phantom

Backpack

Solflare

Mobile

Mobile Wallet Adapter

Seeker compatible

Session Keys

MagicBlock Integration

Must demonstrate MagicBlock.

Implement:

Session Keys

Delegation

Ephemeral Rollups

Fast updates

Gasless gameplay

Persistent player data

Run lifecycle

Start Run

Checkpoint

End Run

Commit Score

Leaderboard Update

PWA

Must support

Offline assets

Install prompt

Splash screen

App icons

Landscape and portrait support

Fast loading

Responsive

Audio

Ambient fantasy music

Footsteps

Orb collection

Magic

Jump

Slide

Demon roar

Game Over

Victory

Dynamic music layers

Effects

Bloom

Particles

Magic trails

Glow

Screen shake

Lens flare

Fog

Post-processing

Performance

60 FPS target

Mobile optimized

Asset streaming

LOD

Instancing

Texture atlases

Object pooling

Lazy loading

Code Quality

Strict TypeScript

Modular architecture

SOLID principles

Reusable systems

No duplicated code

Comprehensive comments

Production-ready

Deliverables

Produce:

Production-ready repository

Documentation

README

Architecture docs

Deployment guide

Game design document

API documentation

MagicBlock integration guide

Wallet integration guide

Development Order

Do NOT implement randomly.

Implement in milestones.

Milestone 1

Architecture

Milestone 2

Project setup

Milestone 3

Rendering

Milestone 4

Player controller

Milestone 5

Camera

Milestone 6

Procedural generation

Milestone 7

Gameplay systems

Milestone 8

UI

Milestone 9

Wallet integration

Milestone 10

MagicBlock integration

Milestone 11

Leaderboards

Milestone 12

Polish

Milestone 13

Optimization

Milestone 14

Testing

Milestone 15

Deployment

Final Goal

Deliver a polished, mobile-first, browser-based 3D endless runner that showcases the strengths of MagicBlock Ephemeral Rollups and Solana Mobile. The experience should feel like a premium indie game rather than a blockchain demo, with blockchain features enhancing gameplay through seamless wallet onboarding, persistent progression, and verifiable on-chain leaderboards instead of interrupting it.