1. kafka queue system
  a. communicates over http
    endpoints:
      - GET /api/topics
      - POST /api/producers #{ host, topic, format }
      - POST /api/subscribers #{ topcis: string[], host: string }
      - GET /api/messages #get params: topic: string, start?:string timestamp
      - POST /api/messages #{ body }
  b. stores messages on fs, for message replay
  c. stores subscribers/publishers on the fs, to resume after potential crash
2. HTTP producer
  a. given a queue url, it registers as producer on several topics
3. consumer
  a. given a queue url, it subscribes to topics
  b. consumes messages by printing to console
4. local producer
  a. registers as a producer on the local filesystem (so that the queue knows to watch topic folder for changes), and creates files