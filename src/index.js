const shuffle = require('shuffle-array');
const utils = require('./utils');
var config = require('./../config/index');

const maxRetryLimit = 50;

/**
 * Fetch images.
 * 
 * @param {Object} options The default options for the instance
 * @return {Array} array of images
 */
const fetch = async (options = {}) => {
    try {
        let searchLimit = 75;
        let total = 1;
        let type = 'meme';
        let subreddit = config.memeSubreddit;

        if (typeof options === "object" && typeof options.type !== 'undefined') {
            if (options.type === 'wallpaper') {
                type = 'wallpaper';
                subreddit = config.wallpaperSubreddit;
            } else if (options.type === 'custom') {
                type = 'custom';
                subreddit = [];
            }
        }

        if (typeof options === "object") {
            if (options.total > 50) {
                throw Error('max value of total is 50');
            } else if (options.total < 1) {
                throw Error('min value of total is 1');
            } else {
                total = options.total;
            }

            if (typeof options.addSubreddit !== 'undefined') {
                subreddit = subreddit.concat(options.addSubreddit);
            }

            if (typeof options.removeSubreddit !== 'undefined') {
                options.removeSubreddit.forEach(element => {
                    let index = subreddit.indexOf(element);
                    if (index !== -1) subreddit.splice(index, 1);
                });
            }

            if (type === 'custom' && typeof options.subreddit !== 'undefined') {
                subreddit = options.subreddit;
            }
        }
        
        if (!subreddit.length) {
            throw Error('Can not fetch from empty subreddit library');
        }
        console.log(subreddit.length);
        return await getRandomPosts(parseInt(total), type, subreddit, searchLimit);
    } catch (error) {
        throw Error(error);
    }
}

/**
 * Get n random posts where n = total
 * 
 * @param {number} total 
 * @param {String} type
 * @param {Array} subreddit 
 * @param {number} searchLimit 
 * @param {number} counter 
 * @param {Array} fetchedPost
 */
const getRandomPosts = async (total, type, subreddit, searchLimit, counter = 0, fetchedPost = []) => {
    //retry limit check
    counter++;
    if (counter == maxRetryLimit)
        throw Error('Maximum retry limit exceeded');
    try {
        //get request
        let rand     = utils.randomNumber(0, subreddit.length);
        var response = await utils.getRequest('https://api.reddit.com/r/' + subreddit[rand] + '/' + shuffle.pick(config.searchType, { 'picks': 1 }) + '?limit=' + searchLimit);
    } catch (error) {
        //retry if error occurs
        return await getRandomPosts(total, type, subreddit, searchLimit, counter);
    }

    //push image only post to post array
    let postArray = response.data.data.children;
    postArray.forEach(post => {
        let includeGif = true;
        if (type === 'wallpaper')
            includeGif = false;
        if (typeof post.data !== "undefined" && typeof post.data.url !== "undefined" && utils.isImageUrl(post.data.url, includeGif))
            fetchedPost.push(utils.formatPost(post.data, type));
    });

    //if total is not reached, retry with already fetched data 
    if (fetchedPost.length < total)
        fetchedPost = await getRandomPosts(total, type, subreddit, searchLimit, counter, fetchedPost);

    //return result as array
    if (total === 1)
        return [shuffle.pick(fetchedPost, { 'picks': total })];

    return shuffle.pick(fetchedPost, { 'picks': total });
}

module.exports.fetch = fetch;