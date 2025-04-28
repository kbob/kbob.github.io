---
categories:
- 3D Printing
- FilaBilly Humidor
cover: /images/filabilly-humidor/filament-spools-cover.jpg
date: 2025-04-28 08:05:31 -0400
excerpt: Over-the-top 3D printer filament storage
layout: post
title: Planning the FilaBilly Humidor
---
[Yowch, this 'blog has been dormant since 2019.  Maybe it'll go dormant
again.  'Blogging is work.]  Anyway...

### Contents

This is the first of several chapters.
 * [Part 2.
 The FilaBilly Dehumidifier](/2025/04/28/the-filabilly-dehumidifier)

# The Idea

I've got a lot of 3D printer filament.  It's stuffed into bins in the
closet, some cupboards in a storage unit, some shelves, and stacks on
the floor.  I keep dessicant in the bins, but the filament still 
absorbs water.

So when I saw [this article by Ben Krejci][krejci] about a Peltier-based
compact filament dehumidifier, I paid attention. Later, I saw the
[FilaBilly][filabilly] filament storage rack and looked into it.  It
uses an IKEA [BILLY][billy] bookcase.  Finally, I found out IKEA makes
[HÖGBO][hogbo] aluminum-framed glass doors and it all clicked.

That's the **FilaBilly Humidor**[^1].  It's an IKEA BILLY-based, glass
doored, actively dehumidified filament storage cabinet.  Then the
features started creeping in.
 
 * For performance, I'd want to seal the cabinet.
 * Since I had a lot of fun adding RGB LEDs to my printer enclosure, I'd
 naturally want to add LEDs here.
 * An air circulation fan might keep the humidity uniform through the
   box.
 * Another humidity sensor would tell me whether the circulation fan is
   effective.
 * A temperature/humidity display would be nice.
 * It would be fun if you could turn on the lights by tapping the glass
   like some refrigerators.
 * Shouldn't it be tied in to [Home Assistant][hassio]?

As the project gets built, we'll see which features actually get
implemented.  Right now it's all just pie in the sky.

 [^1]: *Humidor* usually means a case to keep cigars from drying out.
    But humidors *control* humidity, the don't just increase it.  So a
    dehumidifier is also a humidor.  And "FilaBilly Dehumididor" is too
    unwieldy a phrase even for me.

# The Dehumidifier

This is the heart of it.  The dehumidifier uses a [Peltier
thermoelectric cooling device][peltier] to chill a heatsink and passes
air over it.  The air cools down and water vapor condenses out of it.
There is a PC CPU cooler with integrated fan to move the air and cool
the Peltier's hot side.  Ben found it works best when the chiller is just
below freezing.  Ingenious and simple, though Ben's article makes it
clear he didn't get there in one intuitive leap.

[ESPHome][esphome] ties it all together.  It monitors the cold side
temperature and modulates the Peltier's power using a PID loop.
Basically a thermostat.  It also maintains a freeze/defrost cycle to
control ice buildup.  It also monitors environmental temperature and
humidity.

Ben's description gave me enough information to recreate his device, but
with one big problem: he designed it around a CPU cooler that is no
longer available.  So I'd have to redesign the housing to fit a
different cooler.

# Challenges

Aside from the CPU cooler, there are other open questions about whether
the FilaBilly Humidor is feasible.

* Can I seal a BILLY well enough to keep the air inside dry?
* How do I pass power for the dehumidifier and lights?
* How do I mount the lights?
* What do I do with the extracted water?
* Peltiers are inefficient.  How much electricity will this use?
* How dry will this actually be?

Those questions are still open, though I have plans to address them.

# Progress

I've redesigned the dehumidifier housing to fit a Noctua
[NH-U9S][noctua].  I've built it.  It works.  Part Two of this series
will go into detail about the dehumidifier.

I've acquired a BILLY and I've attempted to seal it with polyurethane.
I've also got some LED strips and aluminum channels for them.  I've done
some research on weather stripping.  I've printed the FilaBilly brackets
and bought steel conduit for the filament rails.  And I have another
Noctua fan for air circulation.

Wish me luck!

# Project Resources

My work on this project is scattered around the web.

This [Github repository][github-repo] has all the digital artifacts: CAD
files, ECAD files, firmware, and [an assembly manual][assembly-manual]
I'm proud of.

The [Dehumidifier print files][printables] are published on Printables.

I have a [build thread on Mastodon][build-thread] which I update
regularly.  Be warned that it's long and it rambles.  Still, if you want
to track the project progress, follow
[#FilaBillyHumidor][hashtag] there.

And watch this space.  Maybe I'll publish another post in less than six
years.

[assembly-manual]: https://github.com/kbob/filabilly-humidor/blob/main/Dehumidifier/Assembly%20Guide/Assembly%20Guide.pdf
[billy]: https://www.ikea.com/us/en/p/billy-bookcase-white-20522046/
[build-thread]: https://chaos.social/@kbob/114142505509126205
[esphome]: https://esphome.io
[filabilly]: https://www.printables.com/model/660713-filabilly-filament-rack
[github-repo]: https://github.com/kbob/filabilly-humidor
[hashtag]: https://chaos.social/tags/FilaBillyHumidor
[hassio]: https://homeassistant.io
[hogbo]: https://www.ikea.com/us/en/p/hoegbo-glass-door-white-20517243/
[krejci]: https://www.benkrejci.com/post/dehumidifier
[noctua]: https://noctua.at/en/products/cpu-cooler-retail/nh-u9s
[peltier]: https://en.wikipedia.org/wiki/Thermoelectric_cooling
[printables]: https://www.printables.com/model/1279373-filabilly-dehumidifier
