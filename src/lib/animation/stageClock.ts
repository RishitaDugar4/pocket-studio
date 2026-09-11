/**
 * The time the *set* is currently showing, in scene seconds.
 *
 * The scene builder, the shot editor and the sequence editor all run different
 * clocks — scene time, shot time, sequence time — but the actors only ever know
 * about scene time. Everything that animates the set reads this, and whoever is
 * driving the view is responsible for keeping it up to date each frame.
 */
export const stageClock = {
  sceneTime: 0,
};
