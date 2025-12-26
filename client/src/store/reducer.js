import {
  SET_MAIN_STREAM,
  ADD_PARTICIPANT,
  SET_USER,
  REMOVE_PARTICIPANT,
  UPDATE_USER,
  UPDATE_PARTICIPANT,
} from "./actiontypes";

import {
  initializeListeners,
  updatePreference,
  addConnection,
} from "../lib/peerConnection";

let defaultUserState = {
  mainStream: null,
  participants: {},
  currentUser: null,
};

const generateColor = () =>
  "#" + Math.floor(Math.random() * 16777215).toString(16);

export const userReducer = (state = defaultUserState, action) => {
  let payload = action.payload;
  if (action.type === SET_MAIN_STREAM) {
    state = { ...state, ...payload };
    return state;
  } else if (action.type === ADD_PARTICIPANT) {
    const currentUserId = Object.keys(state.currentUser)[0];
    const newUserId = Object.keys(payload.newUser)[0];
    if (state.mainStream && currentUserId !== newUserId) {
      addConnection(
        payload.newUser,
        state.currentUser,
        state.mainStream,
        payload.roomId
      );
    }

    let participants = { ...state.participants, ...payload.newUser };
    state = { ...state, participants };
    return state;
  } else if (action.type === SET_USER) {
    const userId = Object.keys(payload.currentUser)[0];
    payload.currentUser[userId].avatarColor = generateColor();
    initializeListeners(userId, payload.roomId);
    return {
      ...state,
      currentUser: { ...payload.currentUser },
      participants: { ...state.participants },
    };
  } else if (action.type === REMOVE_PARTICIPANT) {
    let participants = { ...state.participants };
    delete participants[payload.id];
    state = { ...state, participants };
    return state;
  } else if (action.type === UPDATE_USER) {
    const userId = Object.keys(state.currentUser)[0];
    updatePreference(userId, payload.currentUser);
    state.currentUser[userId] = {
      ...state.currentUser[userId],
      ...payload.currentUser,
    };
    state = {
      ...state,
      currentUser: { ...state.currentUser },
    };
    return state;
  } else if (action.type === UPDATE_PARTICIPANT) {
    const newUserId = Object.keys(payload.newUser)[0];

    payload.newUser[newUserId] = {
      ...state.participants[newUserId],
      ...payload.newUser[newUserId],
    };
    let participants = { ...state.participants, ...payload.newUser };
    state = { ...state, participants };
    return state;
  }
  return state;
};
