import { createRequire } from "module";
const require = createRequire(import.meta.url);
const fs = require("fs");

export class Logger {
    constructor(path) {
        this.logFilePath = path;
        this.maxLogFilePath = this.logFilePath.slice(0, -4) + "_max.txt";
        this.recent = [];
        this.firstValTimestamp_ns = process.hrtime.bigint();
    }

    logOne(val){
        fs.writeFileSync(
            this.logFilePath,
            String(val) + "\n",
            {
                encoding: "utf8",
                flag: "a+",
                mode: 0o666,
            }
        );
    }

    pushRecent(val){
        this.recent.push(val);

        // if(!this.firstValTimestamp_ns){
        //     this.firstValTimestamp_ns = process.hrtime.bigint();
        // }
    }

    logRecentAvarage(){
        const len = this.recent.length;
        if (len <= 0) {
            fs.writeFileSync(this.logFilePath, "none" + "\n", {
                encoding: "utf8",
                flag: "a+",
                mode: 0o666,
            });
            return;
        }

        const avarage = this.recent.reduce((a, b) => a + b) / len;
        const max = Math.max(...this.recent);

        //log avg:
        fs.writeFileSync(this.logFilePath, String(avarage) + "\n", {
            encoding: "utf8",
            flag: "a+",
            mode: 0o666,
        });

        //log max:
        fs.writeFileSync(this.maxLogFilePath, String(max) + "\n", {
            encoding: "utf8",
            flag: "a+",
            mode: 0o666,
        });

        this.firstValTimestamp_ns = process.hrtime.bigint();

        this.recent = [];
    }

    logTotalPerSecond(){
        const len = this.recent.length;
        if (len <= 0) {
            fs.writeFileSync(this.logFilePath, "none" + "\n", {
                encoding: "utf8",
                flag: "a+",
                mode: 0o666,
            });
            return;
        }
        const meassurementTime_ns =
            process.hrtime.bigint() - this.firstValTimestamp_ns;
        const meassurementTime_s = Number(meassurementTime_ns) / 1e9;
        const totalPerSecond =
            this.recent.reduce((a, b) => a + b) / meassurementTime_s;

        const maxPerSecond = Math.max(...this.recent);

        fs.writeFileSync(this.logFilePath, String(totalPerSecond) + "\n", {
            encoding: "utf8",
            flag: "a+",
            mode: 0o666,
        });

        //log max:
        fs.writeFileSync(this.maxLogFilePath, String(maxPerSecond) + "\n", {
            encoding: "utf8",
            flag: "a+",
            mode: 0o666,
        });

        console.log(Number(meassurementTime_ns) / 1e9);

        this.firstValTimestamp_ns = process.hrtime.bigint();

        this.recent = [];
    }
}
