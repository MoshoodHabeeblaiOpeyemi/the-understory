---
title: "What the tab was doing while you read this"
date: 2026-09-10
description: "A single-threaded waiter, a queue of small favors, and the reason your page froze. The event loop, told as a story about a restaurant with one waiter."
tags: ["javascript", "event loop", "browser"]
draft: false
---

Your browser tab is a restaurant with exactly one waiter. Not one per table — one, total, for every table in the room. This sounds like a terrible staffing decision until you learn the trick: the waiter never stands at a table waiting.

He takes your order (your script runs), hands it to the kitchen (the network, the timer, the disk), and immediately walks away. The kitchen is where the slow things happen — fetching, waiting, counting milliseconds. While they cook, the waiter takes the next order, refills the next water glass, redraws the next frame of your scrolling page. When the kitchen bell rings, the finished dish goes into a queue, and the waiter picks it up the moment his hands are empty.

That queue-and-loop is the event loop. It explains almost everything you'll experience this year:

Why a heavy calculation makes the page *freeze* — the waiter's hands are full; nobody's water gets refilled.

Why `setTimeout(fn, 0)` doesn't run immediately — the dish goes in the queue; the waiter finishes the current table first.

Why fetch callbacks don't block anything — the kitchen does the waiting; the waiter never does.

One waiter, one queue, never waits. Once you can tell that story without the screen, you will never fear an async bug again — you'll just ask *who's holding the waiter?*
