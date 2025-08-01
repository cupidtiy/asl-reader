/**
 * Gesture detection module for ASL hand signs
 * Uses geometric analysis of MediaPipe hand landmarks
 */

// Enum of all supported gestures
export const GESTURES = {
    I_LOVE_YOU: 'I Love You',   // Thumb, index, and pinky extended
    HELLO: 'Hello',             // Open palm facing forward
    GOOD: 'Good',               // Thumbs up
    BAD: 'Bad',                 // Thumbs down
    YES: 'Yes',                 // Closed fist (knocking motion in ASL)
    I_ME: 'I/I\'m',             // Index finger pointing up
    NO: 'No',                   // Index and middle fingers extended
    OKAY: 'Okay',               // Thumb and index forming circle
    THANK_YOU: 'Thank You',     // Hand from chin moving forward
    NONE: 'None'                // No gesture detected
};

/**
 * Main gesture detection function
 * Checks landmarks against each gesture pattern in priority order
 * @param {Array} landmarks - 21 hand landmarks from MediaPipe
 * @returns {string} Detected gesture name or 'None'
 */
export function detectGesture(landmarks) {
    // Check each gesture in order of specificity
    // More specific gestures (like I Love You) are checked before general ones (like Hello)
    if (isILoveYouGesture(landmarks)) return GESTURES.I_LOVE_YOU;
    if (isOkayGesture(landmarks)) return GESTURES.OKAY;
    if (isYesGesture(landmarks)) return GESTURES.YES;  // Check fist before thumbs up
    if (isGoodGesture(landmarks)) return GESTURES.GOOD;
    if (isBadGesture(landmarks)) return GESTURES.BAD;
    if (isIGesture(landmarks)) return GESTURES.I_ME;
    if (isNoGesture(landmarks)) return GESTURES.NO;
    if (isThankYouGesture(landmarks)) return GESTURES.THANK_YOU;
    if (isHelloGesture(landmarks)) return GESTURES.HELLO;
    return GESTURES.NONE;
}

/**
 * Detect "I Love You" gesture
 * Thumb, index, and pinky extended; middle and ring folded
 * Combines ASL letters I, L, and Y
 */
function isILoveYouGesture(landmarks) {
    // Get relevant landmarks for each finger
    const thumbTip = landmarks[4];    // Thumb tip
    const thumbIP = landmarks[3];     // Thumb interphalangeal joint
    const indexTip = landmarks[8];    // Index fingertip
    const indexPIP = landmarks[6];    // Index proximal interphalangeal joint
    const middleTip = landmarks[12];  // Middle fingertip
    const middlePIP = landmarks[10];  // Middle proximal interphalangeal joint
    const ringTip = landmarks[16];    // Ring fingertip
    const ringPIP = landmarks[14];    // Ring proximal interphalangeal joint
    const pinkyTip = landmarks[20];   // Pinky fingertip
    const pinkyPIP = landmarks[18];   // Pinky proximal interphalangeal joint
    
    // Check finger positions
    // Thumb extended: tip is above or to the side of joint
    const thumbExtended = thumbTip.y < thumbIP.y || Math.abs(thumbTip.x - thumbIP.x) > 0.1;
    
    // Extended fingers: tip is above (lower y value) than joint
    const indexExtended = indexTip.y < indexPIP.y;
    const pinkyExtended = pinkyTip.y < pinkyPIP.y;
    
    // Folded fingers: tip is below (higher y value) than joint
    const middleFolded = middleTip.y > middlePIP.y;
    const ringFolded = ringTip.y > ringPIP.y;
    
    // All conditions must be true
    return thumbExtended && indexExtended && middleFolded && ringFolded && pinkyExtended;
}

/**
 * Detect open hand (base for Hello and Thank You)
 * Open palm with all fingers extended
 * Used as starting position for motion-based gestures
 */
function isHelloGesture(landmarks) {
    // Get wrist position for palm orientation
    const wrist = landmarks[0];
    
    // Get finger tip and joint positions
    const indexTip = landmarks[8];
    const indexPIP = landmarks[6];
    const middleTip = landmarks[12];
    const middlePIP = landmarks[10];
    const ringTip = landmarks[16];
    const ringPIP = landmarks[14];
    const pinkyTip = landmarks[20];
    const pinkyPIP = landmarks[18];
    
    // Check if all fingers are extended
    const indexExtended = indexTip.y < indexPIP.y;
    const middleExtended = middleTip.y < middlePIP.y;
    const ringExtended = ringTip.y < ringPIP.y;
    const pinkyExtended = pinkyTip.y < pinkyPIP.y;
    
    // Check if palm is facing forward (z-axis indicates depth)
    // Middle finger base (landmark 9) should be in front of wrist
    const palmFacingForward = landmarks[9].z < wrist.z;
    
    // All fingers extended and palm forward
    return indexExtended && middleExtended && ringExtended && pinkyExtended && palmFacingForward;
}

/**
 * Detect "Good" gesture (Thumbs up)
 * Thumb extended upward, all other fingers folded
 */
function isGoodGesture(landmarks) {
    // Get thumb landmarks
    const thumbTip = landmarks[4];   // Thumb tip
    const thumbIP = landmarks[3];    // Thumb interphalangeal joint
    const thumbMCP = landmarks[2];   // Thumb metacarpophalangeal joint
    const wrist = landmarks[0];
    
    // Get finger tip and base positions
    const indexTip = landmarks[8];
    const indexMCP = landmarks[5];   // Index metacarpophalangeal joint (knuckle)
    const middleTip = landmarks[12];
    const middleMCP = landmarks[9];  // Middle metacarpophalangeal joint
    const ringTip = landmarks[16];
    const ringMCP = landmarks[13];   // Ring metacarpophalangeal joint
    const pinkyTip = landmarks[20];
    const pinkyMCP = landmarks[17];  // Pinky metacarpophalangeal joint
    
    // For thumbs up, thumb must be VERY clearly extended
    const thumbDistFromPalm = Math.sqrt(
        Math.pow(thumbTip.x - middleMCP.x, 2) + 
        Math.pow(thumbTip.y - middleMCP.y, 2)
    );
    
    // Calculate thumb extension from its base
    const thumbLength = Math.sqrt(
        Math.pow(thumbTip.x - thumbMCP.x, 2) + 
        Math.pow(thumbTip.y - thumbMCP.y, 2)
    );
    
    // Strict requirements:
    // 1. Thumb must be far from palm center
    const thumbExtended = thumbDistFromPalm > 0.2;
    
    // 2. Thumb must be fully extended from its base
    const thumbFullyExtended = thumbLength > 0.12;
    
    // 3. Thumb must be clearly pointing up (much higher than base)
    const thumbPointingUp = thumbTip.y < thumbMCP.y - 0.08;
    
    // 4. Thumb should also be higher than the wrist
    const thumbAboveWrist = thumbTip.y < wrist.y - 0.05;
    
    // Check if ALL other fingers are tightly folded
    const indexFolded = indexTip.y > indexMCP.y;
    const middleFolded = middleTip.y > middleMCP.y;
    const ringFolded = ringTip.y > ringMCP.y;
    const pinkyFolded = pinkyTip.y > pinkyMCP.y;
    
    // All conditions must be true
    return thumbExtended && thumbFullyExtended && thumbPointingUp && thumbAboveWrist &&
           indexFolded && middleFolded && ringFolded && pinkyFolded;
}

/**
 * Detect "Bad" gesture (Thumbs down)
 * Thumb pointing downward, all other fingers folded
 */
function isBadGesture(landmarks) {
    // Get thumb landmarks
    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const thumbMCP = landmarks[2];
    const wrist = landmarks[0];
    
    // Get finger positions
    const indexTip = landmarks[8];
    const indexMCP = landmarks[5];
    const middleTip = landmarks[12];
    const middleMCP = landmarks[9];
    const ringTip = landmarks[16];
    const ringMCP = landmarks[13];
    const pinkyTip = landmarks[20];
    const pinkyMCP = landmarks[17];
    
    // For thumbs down, thumb must be VERY clearly extended downward
    const thumbDistFromPalm = Math.sqrt(
        Math.pow(thumbTip.x - middleMCP.x, 2) + 
        Math.pow(thumbTip.y - middleMCP.y, 2)
    );
    
    // Calculate thumb extension from its base
    const thumbLength = Math.sqrt(
        Math.pow(thumbTip.x - thumbMCP.x, 2) + 
        Math.pow(thumbTip.y - thumbMCP.y, 2)
    );
    
    // Strict requirements:
    // 1. Thumb must be far from palm center
    const thumbExtended = thumbDistFromPalm > 0.2;
    
    // 2. Thumb must be fully extended from its base
    const thumbFullyExtended = thumbLength > 0.12;
    
    // 3. Thumb must be clearly pointing down (much lower than base)
    const thumbPointingDown = thumbTip.y > thumbMCP.y + 0.08;
    
    // 4. Thumb should also be lower than the wrist
    const thumbBelowWrist = thumbTip.y > wrist.y + 0.05;
    
    // Check if ALL other fingers are tightly folded
    const indexFolded = indexTip.y > indexMCP.y;
    const middleFolded = middleTip.y > middleMCP.y;
    const ringFolded = ringTip.y > ringMCP.y;
    const pinkyFolded = pinkyTip.y > pinkyMCP.y;
    
    // All conditions must be true
    return thumbExtended && thumbFullyExtended && thumbPointingDown && thumbBelowWrist &&
           indexFolded && middleFolded && ringFolded && pinkyFolded;
}

/**
 * Detect "Yes" gesture (Closed fist)
 * All fingers and thumb folded into a fist
 * In ASL, this moves up and down like knocking
 * Works with fist in any orientation
 */
function isYesGesture(landmarks) {
    // Fist detection that excludes thumbs up/down
    const thumbTip = landmarks[4];
    const thumbMCP = landmarks[2];
    const indexTip = landmarks[8];
    const indexMCP = landmarks[5];
    const middleTip = landmarks[12];
    const middleMCP = landmarks[9];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const palmBase = landmarks[9]; // Middle finger MCP
    
    // Check if thumb is truly folded (not extended like in thumbs up/down)
    // For a proper fist, thumb should be close to the palm
    const thumbDistFromPalm = Math.sqrt(
        Math.pow(thumbTip.x - middleMCP.x, 2) + 
        Math.pow(thumbTip.y - middleMCP.y, 2)
    );
    
    // Thumb must be close to palm (not extended for thumbs up/down)
    const thumbFolded = thumbDistFromPalm < 0.08;
    
    // All fingers should be folded
    const indexFolded = indexTip.y > indexMCP.y - 0.02;
    const middleFolded = middleTip.y > middleMCP.y - 0.02;
    const ringFolded = ringTip.y > middleMCP.y - 0.02;
    const pinkyFolded = pinkyTip.y > middleMCP.y - 0.02;
    
    // Also check that fingers are relatively close together (making a fist)
    const fingersClose = Math.abs(indexTip.x - pinkyTip.x) < 0.2;
    
    return thumbFolded && indexFolded && middleFolded && ringFolded && pinkyFolded && fingersClose;
}

/**
 * Detect "I/I'm" gesture
 * Index finger pointing up, all other fingers folded
 * Used to indicate self in ASL
 */
function isIGesture(landmarks) {
    // Get finger positions including thumb
    const thumbTip = landmarks[4];
    const thumbMCP = landmarks[2];
    const indexTip = landmarks[8];
    const indexPIP = landmarks[6];
    const indexMCP = landmarks[5];
    const middleTip = landmarks[12];
    const middleMCP = landmarks[9];
    const ringTip = landmarks[16];
    const ringMCP = landmarks[13];
    const pinkyTip = landmarks[20];
    const pinkyMCP = landmarks[17];
    
    // Check thumb is folded (not sticking out)
    const thumbDistFromIndex = Math.sqrt(
        Math.pow(thumbTip.x - indexMCP.x, 2) + 
        Math.pow(thumbTip.y - indexMCP.y, 2)
    );
    const thumbFolded = thumbDistFromIndex < 0.15;
    
    // Index finger extended upward - more strict
    const indexExtended = indexTip.y < indexPIP.y - 0.05;
    
    // All other fingers folded
    const middleFolded = middleTip.y > middleMCP.y;
    const ringFolded = ringTip.y > ringMCP.y;
    const pinkyFolded = pinkyTip.y > pinkyMCP.y;
    
    // Check if index finger is pointing relatively straight up
    // Small x-axis difference between tip and joint indicates vertical orientation
    const indexPointingUp = Math.abs(indexTip.x - indexPIP.x) < 0.05;
    
    // Index should be clearly extended from the hand
    const indexClearlyExtended = (indexPIP.y - indexTip.y) > 0.08;
    
    return thumbFolded && indexExtended && middleFolded && ringFolded && pinkyFolded && 
           indexPointingUp && indexClearlyExtended;
}


/**
 * Detect "No" gesture
 * Index and middle fingers extended together
 * In ASL, these fingers tap against thumb
 */
function isNoGesture(landmarks) {
    // Get necessary landmarks
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const indexPIP = landmarks[6];
    const indexMCP = landmarks[5];
    const middleTip = landmarks[12];
    const middlePIP = landmarks[10];
    const middleMCP = landmarks[9];
    const ringTip = landmarks[16];
    const ringMCP = landmarks[13];
    const pinkyTip = landmarks[20];
    const pinkyMCP = landmarks[17];
    
    // Index and middle fingers must be clearly extended
    const indexExtended = indexTip.y < indexPIP.y - 0.05;
    const middleExtended = middleTip.y < middlePIP.y - 0.05;
    
    // Check fingers are properly extended from their base
    const indexClearlyExtended = indexTip.y < indexMCP.y - 0.1;
    const middleClearlyExtended = middleTip.y < middleMCP.y - 0.1;
    
    // Ring and pinky folded
    const ringFolded = ringTip.y > ringMCP.y;
    const pinkyFolded = pinkyTip.y > pinkyMCP.y;
    
    // Check if index and middle fingers are close together
    const fingersClose = Math.abs(indexTip.x - middleTip.x) < 0.08;
    
    // Both fingers should be roughly parallel (similar angles)
    const indexAngle = Math.atan2(indexTip.y - indexPIP.y, indexTip.x - indexPIP.x);
    const middleAngle = Math.atan2(middleTip.y - middlePIP.y, middleTip.x - middlePIP.x);
    const fingersParallel = Math.abs(indexAngle - middleAngle) < 0.3;
    
    return indexExtended && middleExtended && indexClearlyExtended && middleClearlyExtended &&
           ringFolded && pinkyFolded && fingersClose && fingersParallel;
}

/**
 * Detect "Okay" gesture
 * Thumb and index finger forming a circle
 * Middle, ring, and pinky fingers extended
 */
function isOkayGesture(landmarks) {
    // Get necessary landmarks
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const indexPIP = landmarks[6];
    const middleTip = landmarks[12];
    const middlePIP = landmarks[10];
    const ringTip = landmarks[16];
    const ringPIP = landmarks[14];
    const pinkyTip = landmarks[20];
    const pinkyPIP = landmarks[18];
    
    // Calculate distance between thumb and index finger tips
    const thumbIndexDistance = Math.sqrt(
        Math.pow(thumbTip.x - indexTip.x, 2) + 
        Math.pow(thumbTip.y - indexTip.y, 2)
    );
    
    // Thumb and index should be touching or very close (forming circle)
    const thumbIndexTouching = thumbIndexDistance < 0.05;
    
    // Other three fingers should be extended
    const middleExtended = middleTip.y < middlePIP.y;
    const ringExtended = ringTip.y < ringPIP.y;
    const pinkyExtended = pinkyTip.y < pinkyPIP.y;
    
    return thumbIndexTouching && middleExtended && ringExtended && pinkyExtended;
}

/**
 * Detect "Thank You" gesture (static position)
 * This is now just a placeholder - actual detection happens via motion tracking
 * We let the motion tracker determine if hand is at chin using face landmarks
 */
function isThankYouGesture(landmarks) {
    // Return false to let motion tracking handle this gesture
    // Thank You is detected when open hand (Hello) moves from chin
    return false;
}