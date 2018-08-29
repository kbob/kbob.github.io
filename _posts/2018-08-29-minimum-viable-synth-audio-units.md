---
categories:
- minimum viable synth
- music
- MacOS
cover: null
date: 2018-08-29 09:55:12 -0400
layout: post
title: 'Minimum Viable Synth: Audio Units'
---
The Minimum Viable Synth was first implemented as a softsynth.  Since
I had a Mac on my desk, I looked at Apple's Audio Units.

Audio Units are a great concept.  Apple provides a framework for audio
plug-ins, and the plug-in writer creates a piece of code that runs in
real-time.  An Audio Unit can also optionally define its own UI, or it
can rely on the app to define a default UI.

The architecture is sound.  It's about as good as you could hope for,
for a general purpose audio processing API.  The AU (the part you
write) has a realtime entry and an optional front end, And there is an
opaque mechanism for the front end to control the realtime part.

On the other hand, Apple never quite finished documenting Audio Units,
and now they're been deprecated in favor of Audio Units V3.  "Classic"
Audio Units are now known as V2.  Since I did my work before V3
existed, I don't know how or whether V3 is better.

Audio Units are categorized in a hierarchy.  Here is the diagram from
Apple's documentation.

![AU Class Hierarchy](/images/au_class_hierarchy.jpg)

The Minimum Viable Synth is a monotimbral instrument, so it derives
from AUMonotimbralInstrumentBase.  It has a static array of notes
derived from SynthNote.

Apple has a developer tool called AU Lab.  It is a nifty little app
that allows Audio Units to be loaded and chained together.  It can
read MIDI from an external controller and it can play audio files.
It lets each AU drive its own UI, or it provides a clunky default UI.
It also handles MIDI and has a flexible, though totally manual, system
to map MIDI controllers to Audio Unit parameters.

An Audio Unit is packaged as a MacOS component (plug-in).  Plug-ins
are not trivial to set up, so I wrote an Xcode wizard to create them.
That wizard, in incomplete state, is here.

https://github.com/kbob/AppleAudioUnits


**Next:** Defining the MVS' architecture.
