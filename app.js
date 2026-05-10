// LexKo Music Production Assistant - App Logic

// DOM Elements
// DOM Elements
let currentBaseKey = "C";
let currentAccidental = "";
let currentRoot = "C";
let currentScaleType = "major";
const currentScaleName = document.getElementById('current-scale-name');
const baseKeyBtns = document.querySelectorAll('.base-key-btn');
const accidentalBtns = document.querySelectorAll('.accidental-btn');
const displayBtns = document.querySelectorAll('.display-btn');
const quickSearchInput = document.getElementById('quick-search');
let currentDisplayPref = "theory";

const NOTES_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTES_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

function formatNoteName(noteName) {
    try {
        let simplified = Tonal.Note.simplify(noteName);
        if (currentDisplayPref === "theory") {
            return simplified;
        }
        const chroma = Tonal.Note.get(simplified).chroma;
        if (chroma === undefined || chroma === null) return simplified;
        return currentDisplayPref === "sharp" ? NOTES_SHARP[chroma] : NOTES_FLAT[chroma];
    } catch (e) {
        return noteName;
    }
}
const typeBtns = document.querySelectorAll('.type-btn');
const scaleTypeOther = document.getElementById('scale-type-other');
const btnTogglePiano = document.getElementById('btn-toggle-piano');
const pianoSection = document.getElementById('piano-section');
const btnRandomProg = document.getElementById('btn-random-prog');
const currentScaleNotesDisplay = document.getElementById('current-scale-notes');
const pianoContainer = document.getElementById('piano-container');
const btnPlayScale = document.getElementById('btn-play-scale');
const btnDownloadMidi = document.getElementById('btn-download-midi');
const currentOctaveDisplay = document.getElementById('current-octave');
const btnOctaveUp = document.getElementById('btn-octave-up');
const btnOctaveDown = document.getElementById('btn-octave-down');
const instrumentSelect = document.getElementById('instrument-select');

// Progression DOM Elements
const progressionInput = document.getElementById('progression-input');
const btnAnalyze = document.getElementById('btn-analyze');
const chordResults = document.getElementById('chord-results');
const suggestionPanel = document.getElementById('suggestion-panel');
const suggTargetChord = document.getElementById('sugg-target-chord');
const suggContent = document.getElementById('sugg-content');
const presetSelect = document.getElementById('preset-select');
const randomScopeSelect = document.getElementById('random-scope-select');
const btnPlayProg = document.getElementById('btn-play-prog');
const btnDownloadProgMidi = document.getElementById('btn-download-prog-midi');

// State
let baseOctave = 3;
const NUM_OCTAVES = 2; // Show 2 octaves on the piano
let currentScale = [];
let currentScaleNotesWithOctave = [];
let currentProgression = []; // Stores {name, originalNumeral, notes, data}
let allProgressionsData = []; // Full DB for random
let currentProgressionName = "Custom";

// Audio Setup (Tone.js)
// Using a basic PolySynth with a slightly nicer envelope for MVP
const instrumentPresets = {
    'electric-piano': {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.05, decay: 0.2, sustain: 0.2, release: 1.5 }
    },
    'synth-lead': {
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 1.0 }
    },
    '8bit': {
        oscillator: { type: "square" },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 }
    },
    'dream-pad': {
        oscillator: { type: "sine" },
        envelope: { attack: 0.8, decay: 0.5, sustain: 0.8, release: 2.0 }
    },
    'pluck': {
        oscillator: { type: "triangle8" },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 }
    }
};

const synth = new Tone.PolySynth(Tone.Synth, instrumentPresets['electric-piano']).toDestination();

// Realistic Sampler
const pianoSampler = new Tone.Sampler({
    urls: {
        "A0": "A0.mp3", "C1": "C1.mp3", "D#1": "Ds1.mp3", "F#1": "Fs1.mp3",
        "A1": "A1.mp3", "C2": "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3",
        "A2": "A2.mp3", "C3": "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3",
        "A3": "A3.mp3", "C4": "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3",
        "A4": "A4.mp3", "C5": "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3",
        "A5": "A5.mp3", "C6": "C6.mp3", "D#6": "Ds6.mp3", "F#6": "Fs6.mp3",
        "A6": "A6.mp3", "C7": "C7.mp3", "D#7": "Ds7.mp3", "F#7": "Fs7.mp3",
        "A7": "A7.mp3", "C8": "C8.mp3"
    },
    baseUrl: "https://tonejs.github.io/audio/salamander/"
}).toDestination();

let activeSynth = pianoSampler; // default to realistic piano

function changeInstrument() {
    if (!instrumentSelect) return;
    const selection = instrumentSelect.value;

    if (selection === 'grand-piano') {
        activeSynth = pianoSampler;
    } else {
        activeSynth = synth;
        const preset = instrumentPresets[selection];
        synth.set(preset);
    }
}

// Tone.js needs a user gesture to start audio context
let audioContextStarted = false;
document.body.addEventListener('click', async () => {
    if (!audioContextStarted) {
        await Tone.start();
        audioContextStarted = true;
        document.querySelector('.status-indicator').innerHTML = '<div class="dot" style="background-color: #10b981; box-shadow: 0 0 8px #10b981;"></div> Audio Engine Active';
    }
}, { once: true });

// Constants
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Initialization
function init() {
    renderPiano();
    updateScale();
    loadProgressionsLibrary();

    // Quick Search Event
    if (quickSearchInput) {
        quickSearchInput.addEventListener('input', (e) => {
            parseQuickInput(e.target.value);
        });
    }

    // Event Listeners
    baseKeyBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            baseKeyBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentBaseKey = e.target.dataset.val;
            currentRoot = currentBaseKey + currentAccidental;
            updateScale();
            analyzeProgression();
        });
    });

    accidentalBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            accidentalBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentAccidental = e.target.dataset.val;
            currentRoot = currentBaseKey + currentAccidental;
            updateScale();
            analyzeProgression();
        });
    });

    displayBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            displayBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentDisplayPref = e.target.dataset.val;
            updateScale();
        });
    });

    typeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            typeBtns.forEach(b => b.classList.remove('active'));
            scaleTypeOther.value = "";
            e.target.classList.add('active');
            currentScaleType = e.target.dataset.val;
            updateScale();
            analyzeProgression();
        });
    });

    if (scaleTypeOther) {
        scaleTypeOther.addEventListener('change', (e) => {
            if (e.target.value !== "") {
                typeBtns.forEach(b => b.classList.remove('active'));
                currentScaleType = e.target.value;
                updateScale();
                analyzeProgression();
            }
        });
    }

    btnTogglePiano.addEventListener('click', () => {
        pianoSection.classList.toggle('collapsed');
    });

    btnRandomProg.addEventListener('click', () => {
        if (allProgressionsData.length > 0) {
            const scope = randomScopeSelect ? randomScopeSelect.value : 'ALL';
            let pool = allProgressionsData;
            if (scope !== 'ALL') {
                pool = pool.filter(p => p.category === scope);
            }
            if (pool.length === 0) pool = allProgressionsData;

            const picked = pool[Math.floor(Math.random() * pool.length)];
            const val = picked.numerals.join(' ');
            currentProgressionName = picked.name;
            if (presetSelect) presetSelect.value = val;
            progressionInput.value = val;
            analyzeProgression();
        }
    });

    instrumentSelect.addEventListener('change', changeInstrument);

    btnPlayScale.addEventListener('click', playScale);
    btnDownloadMidi.addEventListener('click', downloadMidi);

    // Progression Listeners
    btnAnalyze.addEventListener('click', analyzeProgression);
    if (presetSelect) {
        presetSelect.addEventListener('change', () => {
            const val = presetSelect.value;
            if (val) {
                currentProgressionName = presetSelect.options[presetSelect.selectedIndex].text;
                progressionInput.value = val;
                analyzeProgression();
            }
        });
    }

    if (progressionInput) {
        progressionInput.addEventListener('input', () => {
            currentProgressionName = "Custom";
        });
    }
    btnPlayProg.addEventListener('click', playProgression);
    btnDownloadProgMidi.addEventListener('click', downloadProgressionMidi);


    btnOctaveUp.addEventListener('click', () => {
        if (baseOctave < 6) {
            baseOctave++;
            renderPiano();
            updateScale();
        }
    });

    btnOctaveDown.addEventListener('click', () => {
        if (baseOctave > 1) {
            baseOctave--;
            renderPiano();
            updateScale();
        }
    });
}

// Logic to generate the piano keys dynamically
function renderPiano() {
    pianoContainer.innerHTML = '';
    let whiteKeyIndex = 0;

    currentOctaveDisplay.innerText = `C${baseOctave} - C${baseOctave + NUM_OCTAVES}`;

    // Generate notes for NUM_OCTAVES + 1 note (ending on C)
    const totalNotes = NUM_OCTAVES * 12 + 1;

    for (let i = 0; i < totalNotes; i++) {
        const octave = baseOctave + Math.floor(i / 12);
        const noteIndex = i % 12;
        const noteName = NOTES[noteIndex];
        const fullNoteName = `${noteName}${octave}`;
        const isBlack = noteName.includes('#');

        const key = document.createElement('div');
        key.dataset.note = fullNoteName;
        key.dataset.noteClass = noteName; // for scale matching

        // Add note label for all keys
        const label = document.createElement('div');
        label.className = 'key-label';
        label.innerText = isBlack ? noteName : fullNoteName;
        key.appendChild(label);

        if (isBlack) {
            key.className = 'key key-black';
            // Position black keys
            // Black keys are located between white keys.
            // whiteKeyIndex is currently the index of the NEXT white key.
            // We want it to be centered on the line between whiteKeyIndex - 1 and whiteKeyIndex.
            key.style.left = `calc(${whiteKeyIndex} * 50px)`;
        } else {
            key.className = 'key key-white';
            whiteKeyIndex++;
        }

        // Interaction
        key.addEventListener('mousedown', () => playNote(fullNoteName, key));
        key.addEventListener('mouseup', () => stopNote(fullNoteName, key));
        key.addEventListener('mouseleave', () => stopNote(fullNoteName, key));

        // Touch support
        key.addEventListener('touchstart', (e) => { e.preventDefault(); playNote(fullNoteName, key); });
        key.addEventListener('touchend', (e) => { e.preventDefault(); stopNote(fullNoteName, key); });

        pianoContainer.appendChild(key);
    }
}

function playNote(note, keyElement) {
    if (audioContextStarted) {
        activeSynth.triggerAttack(note);
    }
    keyElement.classList.add('playing');
}

function stopNote(note, keyElement) {
    if (audioContextStarted) {
        activeSynth.triggerRelease(note);
    }
    keyElement.classList.remove('playing');
}

function updateScale() {
    const root = currentRoot;
    const type = currentScaleType;

    // Tonal.js calculation
    const scaleData = Tonal.Scale.get(`${root} ${type}`);
    currentScale = scaleData.notes; // Array of note names like ["C", "D", "E"...]

    // Update UI text
    currentScaleName.innerText = `${root} ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    const displayNotes = currentScale.map(n => formatNoteName(n));
    currentScaleNotesDisplay.innerText = displayNotes.join(" - ");

    // Calculate currentScaleNotesWithOctave for MIDI generation and playing
    currentScaleNotesWithOctave = [];
    let currentOct = baseOctave;

    for (let i = 0; i < currentScale.length; i++) {
        let note = currentScale[i];

        // Handling octave shifts if the scale crosses C
        if (i > 0) {
            const prevNote = currentScale[i - 1];
            const prevChroma = Tonal.Note.get(prevNote).chroma;
            const currChroma = Tonal.Note.get(note).chroma;
            if (currChroma < prevChroma) {
                currentOct++;
            }
        }

        // Ensure note is simplified (e.g. C## -> D) for matching with our keys
        const simpleNote = Tonal.Note.simplify(note);
        currentScaleNotesWithOctave.push(`${simpleNote}${currentOct}`);
    }
    // Add the top root note to finish the scale
    const lastNote = currentScale[0];
    const prevNote = currentScale[currentScale.length - 1];
    const prevChroma = Tonal.Note.get(prevNote).chroma;
    const currChroma = Tonal.Note.get(lastNote).chroma;
    let finalOct = currentOct;
    if (currChroma < prevChroma) {
        finalOct++;
    }
    currentScaleNotesWithOctave.push(`${Tonal.Note.simplify(lastNote)}${finalOct}`);

    // Update piano UI highlights
    highlightScaleOnPiano();
    updatePianoLabels();
}

function highlightScaleOnPiano() {
    const keys = document.querySelectorAll('.key');
    const scaleChromas = currentScale.map(n => Tonal.Note.get(n).chroma).filter(c => c !== undefined);

    keys.forEach(key => {
        const noteClass = key.dataset.noteClass;
        const keyChroma = Tonal.Note.get(noteClass).chroma;
        if (keyChroma !== undefined && scaleChromas.includes(keyChroma)) {
            key.classList.add('in-scale');
        } else {
            key.classList.remove('in-scale');
        }
    });
}

function updatePianoLabels() {
    const keys = document.querySelectorAll('.key');
    keys.forEach(key => {
        const noteClass = key.dataset.noteClass; // the sharp version from NOTES array
        const fullNoteName = key.dataset.note;   // e.g. "C#4"
        const isBlack = noteClass.includes('#');

        let displayNote = formatNoteName(noteClass);
        let octave = fullNoteName.replace(/\D/g, ""); // extract digit
        let displayFull = displayNote + octave;

        const label = key.querySelector('.key-label');
        if (label) {
            label.innerText = isBlack ? displayNote : displayFull;
        }
    });
}

function playScale() {
    if (!audioContextStarted) return;

    let timeOffset = 0;
    const now = Tone.now();

    currentScaleNotesWithOctave.forEach((note, index) => {
        // Play each note for 0.4 seconds, every 0.5 seconds
        activeSynth.triggerAttackRelease(note, "8n", now + timeOffset);

        // Highlight UI temporarily
        const keys = document.querySelectorAll(`.key`);
        const targetChroma = Tonal.Note.get(note).chroma;
        const targetOct = Tonal.Note.get(note).oct;

        const keyToHighlight = Array.from(keys).find(k => {
            const kChroma = Tonal.Note.get(k.dataset.noteClass).chroma;
            const kOct = parseInt(k.dataset.note.replace(/\D/g, ""));
            return kChroma === targetChroma && kOct === targetOct;
        });

        if (keyToHighlight) {
            setTimeout(() => keyToHighlight.classList.add('playing'), timeOffset * 1000);
            setTimeout(() => keyToHighlight.classList.remove('playing'), (timeOffset + 0.4) * 1000);
        }

        timeOffset += 0.5;
    });
}

function downloadMidi() {
    try {
        const midi = new Midi();
        const track = midi.addTrack();

        currentScaleNotesWithOctave.forEach((note, i) => {
            track.addNote({
                name: note,
                time: i * 0.5,
                duration: 0.4,
                velocity: 0.8
            });
        });

        const blob = new Blob([midi.toArray()], { type: 'audio/midi' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const fileName = `${currentScaleName.innerText.replace(/ /g, '_')}_Scale.mid`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error('MIDI Download Error:', err);
        alert('MIDI Download Failed, check Console.');
    }
}

// === Progression Logic ===

// Helper: resolve the bass note from a slash chord's right-hand side.
// Handles both arabic scale degrees (1-7) and Roman numerals (bVII, IV, etc.)
function resolveBassNote(root, bassStr) {
    // Case 1: pure scale degree number e.g. "7", "5", "3"
    if (/^\d$/.test(bassStr)) {
        const degree = parseInt(bassStr, 10);
        const scaleData = Tonal.Scale.get(`${root} major`);
        if (scaleData.notes && scaleData.notes[degree - 1]) {
            return Tonal.Note.simplify(scaleData.notes[degree - 1]);
        }
        return null;
    }
    // Case 2: Roman numeral (including bVII, #IV, etc.)
    const tempChord = Tonal.Progression.fromRomanNumerals(root, [bassStr])[0];
    if (tempChord) {
        return Tonal.Note.simplify(Tonal.Chord.get(tempChord).tonic);
    }
    return null;
}

function analyzeProgression() {
    const root = currentRoot;
    const numeralsStr = progressionInput.value.trim();
    if (!numeralsStr) return;

    const numerals = numeralsStr.split(/\s+/);

    currentProgression = [];
    chordResults.innerHTML = '';
    suggestionPanel.style.display = 'none';

    // Helper: parse a single numeral (no slash), handling dim/dim7/m7b5 suffixes
    // that Tonal.Progression.fromRomanNumerals cannot handle directly.
    function parseNumeral(numeral) {
        // First try the standard path
        const direct = Tonal.Progression.fromRomanNumerals(root, [numeral])[0];
        if (direct) return direct;

        // Fallback: strip known quality suffixes and re-attach after resolving root
        // Matches things like: #vdim, iidim7, #Idim7, bVIIdim, bVm7b5, etc.
        const dimMatch = numeral.match(/^([#b]?(?:VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i))(dim7|dim|m7b5|°7|°)$/i);
        if (dimMatch) {
            const baseNumeral = dimMatch[1];
            const qualitySuffix = dimMatch[2];
            const baseChord = Tonal.Progression.fromRomanNumerals(root, [baseNumeral])[0];
            if (baseChord) {
                // Extract just the root note from the resolved chord name
                const baseChordData = Tonal.Chord.get(baseChord);
                const chordRoot = baseChordData.tonic || Tonal.Note.get(baseChord).pc || baseChord.replace(/[^A-Gb#]/g, '');
                // Map suffix to Tonal quality string
                const qualityMap = { 'dim': 'dim', 'dim7': 'dim7', '°': 'dim', '°7': 'dim7', 'm7b5': 'm7b5' };
                const quality = qualityMap[qualitySuffix] || 'dim';
                const resolved = `${chordRoot}${quality}`;
                // Verify Tonal can parse it
                const check = Tonal.Chord.get(resolved);
                if (!check.empty) return resolved;
            }
        }
        return '';
    }

    // Custom parser: handle both plain numerals and slash chords (inversions)
    // Each entry: { chordName: string, slashBassNote: string|null, baseNotes: string[] }
    const parsedChords = numerals.map(numeral => {
        if (numeral.includes('/')) {
            const [baseNumeral, bassNumeral] = numeral.split('/');
            const resolvedBase = parseNumeral(baseNumeral);
            const bassNote = resolveBassNote(root, bassNumeral);
            if (!resolvedBase || !bassNote) return { chordName: '', slashBassNote: null, baseNotes: [] };

            // resolvedBase may be "C major" or "C" — get the symbol for a clean chord name
            const baseData = Tonal.Chord.get(resolvedBase);
            const symbol = baseData.symbol || resolvedBase; // e.g. "C" or "Cm"
            const chordName = `${symbol}/${bassNote}`;      // e.g. "C/E" — Tonal recognises this
            return { chordName, slashBassNote: bassNote, baseNotes: baseData.notes };
        }
        const resolved = parseNumeral(numeral);
        return { chordName: resolved, slashBassNote: null, baseNotes: [] };
    });

    parsedChords.forEach(({ chordName, slashBassNote, baseNotes }, i) => {
        if (!chordName) {
            const card = document.createElement('div');
            card.className = 'chord-card';
            card.innerText = '?';
            card.style.borderColor = 'rgba(239,68,68,0.8)';
            card.title = `Could not parse: ${numerals[i]}`;
            chordResults.appendChild(card);
            currentProgression.push({ name: '', originalNumeral: numerals[i], notes: [], data: {} });
            return;
        }

        const chordData = Tonal.Chord.get(chordName);

        // Voicing
        // For slash chords we MUST use the pre-fetched baseNotes because
        // Tonal.Chord.get("C/E").notes is always [] by design.
        let notesWithOctave = [];
        if (slashBassNote) {
            const bassNote = Tonal.Note.simplify(slashBassNote);
            notesWithOctave.push(`${bassNote}${baseOctave}`);
            baseNotes.forEach(n => {
                const simpleNote = Tonal.Note.simplify(n);
                if (simpleNote !== bassNote) {
                    notesWithOctave.push(`${simpleNote}${baseOctave + 1}`);
                }
            });
            // Edge case: bass note was the only note (shouldn't happen with real chords)
            if (notesWithOctave.length <= 1) {
                notesWithOctave = baseNotes.map((n, idx) => {
                    const simpleNote = Tonal.Note.simplify(n);
                    return `${simpleNote}${idx === 0 ? baseOctave : baseOctave + 1}`;
                });
            }
        } else {
            notesWithOctave = chordData.notes.map((n, idx) => {
                const simpleNote = Tonal.Note.simplify(n);
                return `${simpleNote}${idx === 0 ? baseOctave : baseOctave + 1}`;
            });
        }

        currentProgression.push({
            name: chordName,
            originalNumeral: numerals[i],
            notes: notesWithOctave,
            data: chordData
        });

        // Display: apply formatNoteName to both sides of slash
        let displayChordName = chordName;
        if (!chordData.empty && chordData.tonic) {
            const formattedTonic = formatNoteName(chordData.tonic);
            let leftPart = chordName.split('/')[0].replace(chordData.tonic, formattedTonic);
            displayChordName = chordData.bass
                ? `${leftPart}/${formatNoteName(chordData.bass)}`
                : leftPart;
        }

        const card = document.createElement('div');
        card.className = 'chord-card';
        card.innerText = displayChordName;
        card.addEventListener('click', () => showSuggestions(chordName, chordData));
        chordResults.appendChild(card);
    });
}

function showSuggestions(chordName, chordData) {
    suggestionPanel.style.display = 'block';
    suggTargetChord.innerText = chordName;
    suggContent.innerHTML = '';

    const extensions = chordData.extensions || [];
    let html = '<strong>Extensions:</strong> ';
    if (extensions.length === 0) {
        html += 'None common. ';
    } else {
        extensions.slice(0, 4).forEach(ext => {
            // Reconstruct the root + extension. Tonal extensions are like "maj9", "69"
            const extName = chordData.tonic + ext;
            html += `<span class="suggestion-chip" onclick="applySuggestion('${extName}')">${extName}</span>`;
        });
    }

    // Add Triton Sub if it's a dominant 7th
    if (chordData.aliases.includes('7')) {
        const tritoneSubRoot = Tonal.Note.transpose(chordData.tonic, '5d');
        html += `<br><br><strong>Tritone Substitution:</strong> <span class="suggestion-chip" onclick="applySuggestion('${tritoneSubRoot}7')">${tritoneSubRoot}7</span>`;
    }

    suggContent.innerHTML = html;
}

window.applySuggestion = function (newChord) {
    suggTargetChord.innerText = `${newChord} (Previewing)`;
    // Play the suggested chord
    if (!audioContextStarted) return;
    const data = Tonal.Chord.get(newChord);
    const notes = data.notes.map((n, idx) => `${Tonal.Note.simplify(n)}${idx === 0 ? baseOctave : baseOctave + 1}`);
    activeSynth.triggerAttackRelease(notes, "2n");
}

function playProgression() {
    if (!audioContextStarted) return;

    let timeOffset = 0;
    const now = Tone.now();
    const duration = 1.0; // 1 second per chord

    const cards = document.querySelectorAll('.chord-card');

    currentProgression.forEach((chord, index) => {
        activeSynth.triggerAttackRelease(chord.notes, duration * 0.9, now + timeOffset);

        if (cards[index]) {
            setTimeout(() => cards[index].classList.add('playing'), timeOffset * 1000);
            setTimeout(() => cards[index].classList.remove('playing'), (timeOffset + duration * 0.9) * 1000);
        }

        timeOffset += duration;
    });
}

function downloadProgressionMidi() {
    if (currentProgression.length === 0) return;

    try {
        const midi = new Midi();
        const track = midi.addTrack();

        currentProgression.forEach((chord, i) => {
            chord.notes.forEach(note => {
                track.addNote({
                    name: note,
                    time: i * 1.0, // 1 second per chord
                    duration: 0.9,
                    velocity: 0.8
                });
            });
        });

        const blob = new Blob([midi.toArray()], { type: 'audio/midi' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Format: Key + Name (e.g., C_Royal_Road)
        const safeName = currentProgressionName.replace(/[^a-z0-9]/gi, '_');
        const fileName = `${currentRoot}_${safeName}.mid`;

        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error('MIDI Download Error:', err);
        alert('Progression MIDI Download Failed, check Console.');
    }
}

// === Quick Search Logic ===
function parseQuickInput(val) {
    val = val.trim().toLowerCase();
    if (!val) return;

    const match = val.match(/^([a-g])([#b]?)\s*(.*)$/);
    if (!match) return;

    const baseKey = match[1].toUpperCase();
    const accidental = match[2];
    let typeStr = match[3].replace(/[-\s_]+/g, "");

    let parsedType = "major";
    if (typeStr === "m" || typeStr === "mi" || typeStr === "min" || typeStr === "minor") {
        parsedType = "minor";
    } else if (typeStr === "ma" || typeStr === "maj" || typeStr === "major") {
        parsedType = "major";
    } else if (typeStr === "") {
        parsedType = "major";
    } else {
        const typeMap = {
            "dorian": "dorian",
            "phrygian": "phrygian",
            "lydian": "lydian",
            "mixolydian": "mixolydian",
            "locrian": "locrian",
            "harmonicminor": "harmonic minor",
            "melodicminor": "melodic minor",
            "majorpentatonic": "major pentatonic",
            "minorpentatonic": "minor pentatonic",
            "blues": "blues"
        };
        if (typeMap[typeStr]) {
            parsedType = typeMap[typeStr];
        } else {
            return; // Incomplete or invalid
        }
    }

    // Only update if state changes
    if (currentBaseKey !== baseKey || currentAccidental !== accidental || currentScaleType !== parsedType) {
        currentBaseKey = baseKey;
        currentAccidental = accidental;
        currentRoot = currentBaseKey + currentAccidental;
        currentScaleType = parsedType;

        syncUIWithState();
        updateScale();
        analyzeProgression();
    }
}

function syncUIWithState() {
    baseKeyBtns.forEach(b => {
        if (b.dataset.val === currentBaseKey) b.classList.add('active');
        else b.classList.remove('active');
    });

    accidentalBtns.forEach(b => {
        if (b.dataset.val === currentAccidental) b.classList.add('active');
        else b.classList.remove('active');
    });

    let typeFound = false;
    typeBtns.forEach(b => {
        if (b.dataset.val === currentScaleType) {
            b.classList.add('active');
            typeFound = true;
        } else {
            b.classList.remove('active');
        }
    });

    if (typeFound) {
        if (scaleTypeOther) scaleTypeOther.value = "";
    } else {
        if (scaleTypeOther) scaleTypeOther.value = currentScaleType;
    }
}

// Start the app
window.onload = init;


// === Load Progressions Library ===
function loadProgressionsLibrary() {
    if (!presetSelect) return;

    fetch('progressions.json')
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            presetSelect.innerHTML = '<option value="">-- 選擇一個和弦進行 (Select a progression) --</option>';

            const grouped = {};
            data.categories.forEach(cat => grouped[cat] = []);

            data.progressions.forEach(prog => {
                if (!grouped[prog.category]) grouped[prog.category] = [];
                grouped[prog.category].push(prog);
            });

            const randomScopeSelect = document.getElementById('random-scope-select');
            data.categories.forEach(cat => {
                if (!grouped[cat] || grouped[cat].length === 0) return;
                const optgroup = document.createElement('optgroup');
                optgroup.label = cat;
                grouped[cat].forEach(prog => {
                    const option = document.createElement('option');
                    option.value = prog.numerals.join(' ');
                    option.textContent = prog.name;
                    optgroup.appendChild(option);
                });
                presetSelect.appendChild(optgroup);

                if (randomScopeSelect) {
                    const scopeOpt = document.createElement('option');
                    scopeOpt.value = cat;
                    scopeOpt.textContent = cat;
                    randomScopeSelect.appendChild(scopeOpt);
                }
            });

            // Update random progression array
            allProgressionsData = data.progressions;
        })
        .catch(err => {
            console.error('Failed to load progressions.json:', err);
            presetSelect.innerHTML = '<option value="">-- 載入失敗 (需在伺服器環境運行) --</option>';
        });
}