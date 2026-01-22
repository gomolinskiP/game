export class HighScore{
    static top3 = [];
    static hasChanged = false;

    static notify(username, score){
        //checks if user with score should be put or updated on top3 highscore:

        if(HighScore.top3.length < 3){
            //less than 3 players on top3
            HighScore.update(username, score);
            return;
        }

        const index = HighScore.top3.findIndex(([name]) => name === username);
        if(index >= 0){
            //character already on top3 list:

            HighScore.top3[index][1] = parseInt(score);
            HighScore.sort();
            return;
        }
        else{
            //character not in top3, check if they are better than last current in top3:
            if(score > HighScore.top3[2][1]){
                HighScore.update(username, score);
            }
        }
    }

    static update(username, score){
        HighScore.top3.push([username, parseInt(score)]);
        HighScore.sort();
    }

    static sort(){
        HighScore.top3.sort((a, b) => b[1] - a[1]);
        HighScore.top3 = HighScore.top3.slice(0,3);

        HighScore.hasChanged = true;
    }
}