34567891011121312
import { verifyTokenSecurely, linkParentSecurely } from 'backend/registration.jsw';// Global statelet activePlayerData = null; const PARENT_ROLE_ID = "de5fbcdb-2777-4dfa-aa43-5475aa87905d";$w.onReady(async function () {    const token = wixLocationFrontend.query.token;    if (!token) {        const member = await currentMember.getMember();import wixLocationFrontend from 'wix-location-frontend';import { authentication, currentMember } from 'wix-members-frontend';
import wixLocationFrontend from 'wix-location-frontend';
import { authentication, currentMember } from 'wix-members-frontend';
import { verifyTokenSecurely, linkParentSecurely } from 'backend/registration.jsw';

// Global state
let activePlayerData = null; 
const PARENT_ROLE_ID = "de5fbcdb-2777-4dfa-aa43-5475aa87905d";

$w.onReady(async function () {
    const token = wixLocationFrontend.query.token;

