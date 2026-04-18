const { withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const PATCH_TAG = '# @line-sdk-concurrency-patch';

// LineSDKSwift 5.14.0 declares swift_version: '6.0' in its podspec, so
// CocoaPods compiles it with Swift 6 even though the source isn't compliant.
// We force SWIFT_VERSION back to 5.0 and set SWIFT_STRICT_CONCURRENCY=minimal
// to suppress the "sending self risks data races" build errors on Xcode 16.
// Both settings are needed: SWIFT_VERSION exits Swift-6 mode, and
// SWIFT_STRICT_CONCURRENCY guards against any global 'complete' override.
const PATCH_BODY = `    ${PATCH_TAG}
    installer.pods_project.targets.each do |target|
      next unless target.name == 'LineSDKSwift'
      target.build_configurations.each do |cfg|
        cfg.build_settings['SWIFT_VERSION'] = '5.0'
        cfg.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
      end
    end
`;

const withLineSDK = (config) => {
  return withDangerousMod(config, [
    'ios',
    (mod) => {
      const podfilePath = path.join(mod.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf-8');

      if (contents.includes(PATCH_TAG)) {
        return mod; // already patched (idempotent)
      }

      // Insert PATCH_BODY just before the closing `  end` of the
      // post_install block, which sits directly before the final `end`
      // that closes the target block.
      // The pattern we look for is the unique tail of the generated Podfile:
      //   "    )\n  end\nend\n"  (react_native_post_install closing paren)
      const TAIL = '    )\n  end\nend\n';
      const idx = contents.lastIndexOf(TAIL);
      if (idx === -1) {
        console.warn('[with-line-sdk] Could not locate post_install block tail — skipping patch');
        return mod;
      }

      // TAIL = "    )\n  end\nend\n"; "    )\n" is 6 chars (idx+0..idx+5)
      contents =
        contents.slice(0, idx + 6) + // up to and including "    )\n"
        PATCH_BODY +
        contents.slice(idx + 6);    // "  end\nend\n"

      fs.writeFileSync(podfilePath, contents);
      return mod;
    },
  ]);
};

module.exports = withLineSDK;
