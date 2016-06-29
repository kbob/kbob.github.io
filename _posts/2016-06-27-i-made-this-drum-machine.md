---
categories:
- electronics
- music
- Teensy
cover: /images/drum-cover.jpg
date: 2016-06-27 13:54:46 -0700
layout: post
title: I made this drum machine.
---
In early May, I made this drum machine in three days.  It came out
pretty well for such a quick hack.

**Update 2016-06-29:** Added 3D printing time lapse video.

## Just show me the video, already!

Okay.  Here you go.

<iframe width="560" height="315"
src="https://www.youtube.com/embed/p0GLgOOg_Dg" frameborder="0"
allowfullscreen></iframe>
<br>

## What the heck did I just see?

It's a drum machine.  I made it.  It uses code from two of
[Mutable Instruments](http://mutable-instruments.net)' modules,
two [Teensy](https://www.pjrc.com) dev boards, and the
[JIGMOD](https://www.jigmod.com) prototyping system.


# Day One: Battery Holders

{% include image.html
           src="drum-batteryrender.png"
           title="Battery Holder (rendered)"
       %}

The most important part of designing a new musical instrument is
creating a suitable battery holder, so that's where I started.  I've
been learning
[Fusion 360](http://www.autodesk.com/products/fusion-360/overview), so
I used it.  This was the first time I ever used lofting to
join bodies.

Here's Fusion 360's timeline of the design.  It ignores a lot of
experiments and dead ends.

![CAD](/images/drum-batterycad.gif)

And here's the obligatory 3D printer time lapse.

<iframe width="560" height="315" src="https://www.youtube.com/embed/v09RiDUM0eE" frameborder="0" allowfullscreen></iframe>


# Day Two: JIGMOD and Drum Synth

## JIGMOD

[JIGMOD](https://www.jigmod.com) is a prototyping system based around
breadboards.  The base plate, the breadboards, and all the red PCBs
on the sides are JIGMOD.  I used a five dual-potentiometer JIGMODs and
a quad-button JIGMOD.  They're all mounted on a JIGMOD XL platform.

{% include image.html
           src="drum-static.jpg"
           title="Drum Machine"
       %}

I spent about 15 minutes screwing all the modules together, and
somewhat longer wiring things up.  The end result, though, is pretty
rugged.  I've been carrying it around for a month and a half, letting
kids and adults play with it, and it hasn't come apart.  I like JIGMODs.

## Peaks

Olivier Gillet of
[Mutable Instruments](http://mutable-instruments.net) makes wonderful
Eurorack modules.  Even better, he
[publishes all his designs](https://github.com/pichenettes/eurorack)
as open source.

One of those modules is
[Peaks](http://mutable-instruments.net/modules/peaks).  Peaks is
primarily an envelope generator, but it also has a drum synth built
in.  The drum synth has three voices: bass, snare, and high hat.  I
started with the peaks source code and extracted those three synths.

The drum synth runs on the Teensy 3.1 on the right-hand breadboard.
It receives triggers either from the button at the bottom right or
from the left-hand Teensy.  It also reads four potentiometers on the
right side.  It sends I2S signals to the Teensy Audio Adapter at the upper
right corner.  The audio board has a DAC and a headphone jack.

{% include image.html
           src="drum-peaks.jpg"
           title="Drum Synth Controls"
       %}

I hooked into the I2S interrupt.  The interrupt service routine
generates a single sample on every interrupt.  That means 44.1
interrupts every millisecond.  I love writing hard realtime code on
microcontrollers...

While that's going on, the main loop is continuously watching for
triggers on three input lines.  When a trigger comes in, the drum
starts sounding on the next sample.

Once a millisecond, the main loop pauses to read one of the
potentiometers.  It checks them round-robin, so it reads each pot
every 4 ms.  If the pot has changed, the corresponding synth parameter
is updated.  The bass drum has four parameters: pitch, modulation,
damping, and attack.  The snare has pitch, modulation, damping, and
noisiness — how loud the rattle is.  The high hat has no parameters.

The fourth button switches the knobs between adjusting the bass
and adjusting the snare.

There are also three LEDs at the bottom.  They flash when each drum is
triggered.  They're arranged to look vaguely like a drum set.

So the software is pretty straightforward.  I've put it up
[on GitHub](https://github.com/kbob/drum-machine).


# Day Three: Grids and Refinement

## Grids

The other Mutable Instruments module is
[Grids](http://mutable-instruments.net/modules/grids).  Mutable
describes it as a "Topographic Drum Sequencer".  The idea is that
there's a 5×5 grid of rhythm sequences.  You navigate through that
map (topology) with X and Y controls to select a quartet of nearest rhythms
to interpolate within.  It sounds weird, and it is, but the upshot is
that you have two knobs to twist, and either one will change the
module's rhythm in a semi-random but still musical way[^1].  A big
twist makes a big change, and a small tweak makes a subtle change.

[^1]: For liberal values of "musical" (-:

Grids runs on the Teensy LC on the left side.  It reads seven knobs.
It outputs trigger and accent signals to the drum synth on the other
Teensy.  It also has a Tap/Reset button and matching LED.  The LED
blinks on the downbeat.  I never figured out what the button
does.  The firmware may not be reading it correctly.


{% include image.html
           src="drum-grids.jpg"
           title="Grids Controls"
       %}

For the Grids subsystem, I simply ported Olivier's Grids firmware to
the Teensy.  I set up my own pin mapping, initialization, and low
level functions to read analog inputs and buttons and get timer
interrupts.  Then, I started by calling his highest-level
routine, and wherever he referenced lower level functionality, I
either copy-pasted it in or reimplemented it.

The X and Y knobs move through the rhythm grid.  The three Density
knobs control how often each drum triggers.  The Chaos knob adds an
element of randomness to the rhythm, and also increases the likelihood
of a given trigger being accented.  Finally, the Tempo knob adjusts
the tempo.[^2]

[^2]: Are you surprised?

## Refinement

The surprising thing is, when I finally got Grids to compile, it
worked.  I was waiting for the next compiler error, and my speakers
started saying, "Tappa-tappa-boom-chinga-tappa".  Wow!  That never
happens.

So I had time to make it better.  First, I noticed that the trigger
buttons would short the Grids trigger outputs to ground.  So I added
some diodes and programmed the Teensy LC to engage its internal
pulldown resistors on the trigger outputs.

Next, I hooked up the accent lines.  Grids generates a binary accent
with each trigger.  If the accent line is high, the beat is to be
accented.  I hooked those up to three more pins on the drum synth
and programmed the synth to play an accented note 3 dB louder.

Then I made it stereo, put the snare on the left channel and
high hat on the right, and adjusted the balance a little.


# Future Work

It won't be a three day project if I keep working on it, so these are
just thoughts, not plans.  Still, there are some things I could have
done.

The batteries fall out if you tilt the synth.  I could redesign
the holders so they're more secure.

I thought about putting some labels on the knobs so I can remember
which is which.  But I just don't see a good place for labels.

I'd like to make the Tap/Reset button work.  FWIW, I played with a
real Grids in a music store, and I couldn't make the button do
anything there either.  So maybe I just need to RTFM more closely.

There's no need for two dev boards.  I could make it all run on
a single Teensy with just a little hacking.

And I've thought about doing something to automatically, randomly
drift the X and Y parameters around the grid.

Finally, I could make a PCB, put it into a real case and turn it into
a real instrument.  But I kind of like the homemade look.

So it's done.  This is its final form.  I **made** this drum machine.

<br>
Comment [on Reddit](https://www.reddit.com/r/synthdiy/comments/4q5pcw/i_made_this_drum_machine/).
