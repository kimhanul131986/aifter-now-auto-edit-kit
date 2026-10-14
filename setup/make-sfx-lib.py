"""Build a family-tagged SFX library (mp3 + manifest) from Kenney CC0 packs."""
import glob, json, os, subprocess, sys
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
# family -> glob patterns (relative to the unzipped packs)
FAM = {
    'cut':      ['kenney_interface-sounds/**/click_00[1-5].ogg', 'kenney_ui-audio/**/click[1-5].ogg'],
    'expand':   ['kenney_interface-sounds/**/maximize_00[1-9].ogg'],
    'wipe':     ['kenney_interface-sounds/**/scroll_00[1-5].ogg'],
    'pixel':    ['kenney_interface-sounds/**/glitch_00[1-4].ogg'],
    'zoom':     ['kenney_digital-audio/**/phaserUp[1-7].ogg'],
    'panel':    ['kenney_interface-sounds/**/open_00[1-4].ogg'],
    'skeleton': ['kenney_digital-audio/**/twoTone[1-2].ogg', 'kenney_digital-audio/**/threeTone[1-2].ogg'],
    'rack':     ['kenney_interface-sounds/**/minimize_00[1-9].ogg'],
    'punch':    ['kenney_impact-sounds/**/impactPunch_heavy_00[0-4].ogg'],
    'slot':     ['kenney_interface-sounds/**/pluck_00[1-2].ogg', 'kenney_interface-sounds/**/confirmation_00[1-4].ogg'],
    'tick':     ['kenney_interface-sounds/**/tick_00[1-4].ogg'],
    'lock':     ['kenney_impact-sounds/**/impactBell_heavy_00[0-4].ogg'],
    'stamp':    ['kenney_impact-sounds/**/impactWood_heavy_00[0-4].ogg', 'kenney_impact-sounds/**/impactPlate_heavy_00[0-4].ogg'],
    'pen':      ['kenney_interface-sounds/**/scratch_00[1-5].ogg'],
    'pop':      ['kenney_interface-sounds/**/drop_00[1-4].ogg', 'kenney_digital-audio/**/pepSound[1-5].ogg'],
    'flip':     ['kenney_ui-audio/**/switch[1-9].ogg', 'kenney_ui-audio/**/switch1[0-9].ogg'],
    'snip':     ['kenney_impact-sounds/**/impactMetal_light_00[0-4].ogg'],
    'confirm':  ['kenney_interface-sounds/**/confirmation_00[1-4].ogg'],
    'type':     ['kenney_ui-audio/**/switch2[0-9].ogg'],
    'rise':     ['kenney_digital-audio/**/powerUp[1-9].ogg'],
    'hit':      ['kenney_impact-sounds/**/impactPunch_medium_00[0-4].ogg', 'kenney_impact-sounds/**/impactSoft_heavy_00[0-4].ogg'],
}
man = {}
for fam, pats in FAM.items():
    files = sorted({f for p in pats for f in glob.glob(os.path.join(src, p), recursive=True)})
    man[fam] = []
    for k, f in enumerate(files):
        name = f'{fam}_{k + 1:02d}.mp3'
        dst = os.path.join(out, name)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f, '-ac', '2', '-ar', '48000', '-b:a', '160k', dst], check=True)
        dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', dst], capture_output=True, text=True).stdout)
        man[fam].append({'file': name, 'dur': round(dur, 3), 'src': os.path.relpath(f, src).replace('\\', '/')})
json.dump(man, open(os.path.join(out, 'manifest.json'), 'w', encoding='utf-8'), indent=1)
print({k: len(v) for k, v in man.items()})
