import os
import pandas
os.system("node _csv2json.js")
sheet = pandas.read_csv('bazahei_airdrop_spreadsheet - Sheet1.csv',names = ["idx","principalID"])
limit = len(sheet["idx"])
for i in range(limit):
    os.system("node _mint.js --idx="+str(i))

